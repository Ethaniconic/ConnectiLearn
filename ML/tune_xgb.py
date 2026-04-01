from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib import pyplot as plt
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

try:
    from xgboost import XGBClassifier
except ImportError as exc:
    raise SystemExit(
        "xgboost is required. Install with: pip install xgboost scikit-learn pandas seaborn matplotlib"
    ) from exc


def load_dataset(data_path: Path) -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(data_path)
    if "LearningStyle" not in df.columns:
        raise ValueError("LearningStyle column not found in dataset.")

    y = df["LearningStyle"]
    X = df.drop(columns=["LearningStyle"])
    X = pd.get_dummies(X, drop_first=False)
    return X, y


def build_confusion_matrix_percent(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: list[str],
) -> pd.DataFrame:
    cm = confusion_matrix(y_true, y_pred, labels=range(len(class_names)))
    row_totals = cm.sum(axis=1, keepdims=True)
    row_totals[row_totals == 0] = 1
    cm_percent = (cm / row_totals) * 100.0

    return pd.DataFrame(
        cm_percent,
        index=[f"true_{name}" for name in class_names],
        columns=[f"pred_{name}" for name in class_names],
    )


def random_params(rng: np.random.Generator) -> dict[str, float | int]:
    return {
        "n_estimators": int(rng.choice([300, 400, 500, 700, 900])),
        "max_depth": int(rng.choice([4, 5, 6, 7, 8, 10])),
        "learning_rate": float(rng.choice([0.03, 0.05, 0.07, 0.1, 0.15])),
        "subsample": float(rng.choice([0.75, 0.85, 0.9, 1.0])),
        "colsample_bytree": float(rng.choice([0.7, 0.8, 0.9, 1.0])),
        "min_child_weight": int(rng.choice([1, 2, 3, 5, 7])),
        "gamma": float(rng.choice([0.0, 0.1, 0.2, 0.4])),
        "reg_lambda": float(rng.choice([1.0, 1.5, 2.0, 3.0])),
    }


def build_model(num_class: int, random_state: int, params: dict[str, float | int]) -> XGBClassifier:
    return XGBClassifier(
        objective="multi:softprob",
        num_class=num_class,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=random_state,
        **params,
    )


def tune_params(
    X_train: pd.DataFrame,
    y_train: np.ndarray,
    X_val: pd.DataFrame,
    y_val: np.ndarray,
    num_class: int,
    trials: int,
    random_state: int,
) -> tuple[dict[str, float | int], dict[str, float]]:
    rng = np.random.default_rng(random_state)
    best_params: dict[str, float | int] | None = None
    best_metrics = {"min_recall": -1.0, "mean_recall": -1.0, "accuracy": -1.0}

    for trial in range(1, trials + 1):
        params = random_params(rng)
        model = build_model(num_class=num_class, random_state=random_state, params=params)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_val)

        cm = confusion_matrix(y_val, y_pred, labels=range(num_class))
        recalls = np.diag(cm) / np.maximum(cm.sum(axis=1), 1)
        min_recall = float(recalls.min())
        mean_recall = float(recalls.mean())
        acc = float(accuracy_score(y_val, y_pred))

        is_better = (
            min_recall > best_metrics["min_recall"]
            or (min_recall == best_metrics["min_recall"] and mean_recall > best_metrics["mean_recall"])
            or (
                min_recall == best_metrics["min_recall"]
                and mean_recall == best_metrics["mean_recall"]
                and acc > best_metrics["accuracy"]
            )
        )
        if is_better:
            best_metrics = {
                "min_recall": min_recall,
                "mean_recall": mean_recall,
                "accuracy": acc,
            }
            best_params = params

        print(
            f"Trial {trial:02d}/{trials}: min_recall={min_recall:.4f}, "
            f"mean_recall={mean_recall:.4f}, acc={acc:.4f}, params={params}"
        )

    if best_params is None:
        raise RuntimeError("No hyperparameter candidate was evaluated.")

    return best_params, best_metrics


def save_outputs(
    model: XGBClassifier,
    class_names: list[str],
    feature_columns: list[str],
    confusion_percent_df: pd.DataFrame,
    pkl_out: Path,
    confusion_csv_out: Path,
    confusion_image_out: Path,
) -> None:
    pkl_out.parent.mkdir(parents=True, exist_ok=True)
    with pkl_out.open("wb") as f:
        pickle.dump(
            {
                "model": model,
                "label_classes": class_names,
                "feature_columns": feature_columns,
            },
            f,
        )

    confusion_csv_out.parent.mkdir(parents=True, exist_ok=True)
    confusion_percent_df.to_csv(confusion_csv_out, float_format="%.4f")

    confusion_image_out.parent.mkdir(parents=True, exist_ok=True)
    plt.figure(figsize=(9, 7))
    sns.heatmap(
        confusion_percent_df,
        annot=True,
        fmt=".2f",
        cmap="Blues",
        cbar_kws={"label": "Percentage"},
    )
    plt.title("Tuned XGBoost Confusion Matrix (%)")
    plt.xlabel("Predicted Class")
    plt.ylabel("True Class")
    plt.tight_layout()
    plt.savefig(confusion_image_out, dpi=200)
    plt.close()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Tune XGBoost model for learner type.")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path(__file__).resolve().parent / "data" / "processed" / "questionnaire.csv",
        help="Path to questionnaire dataset CSV.",
    )
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--val-size", type=float, default=0.2)
    parser.add_argument("--trials", type=int, default=35)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument(
        "--pkl-out",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "xgb_model_tuned.pkl",
    )
    parser.add_argument(
        "--confusion-out",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "confusion_matrix_tuned_percent.csv",
    )
    parser.add_argument(
        "--confusion-image-out",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "confusion_matrix_tuned_percent.png",
    )
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    if not args.data.exists():
        raise SystemExit(f"Dataset not found: {args.data}")

    X, y = load_dataset(args.data)
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    class_names = encoder.classes_.tolist()

    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X,
        y_encoded,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y_encoded,
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval,
        y_trainval,
        test_size=args.val_size,
        random_state=args.random_state,
        stratify=y_trainval,
    )

    print("Tuning hyperparameters...")
    best_params, best_metrics = tune_params(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        num_class=len(class_names),
        trials=args.trials,
        random_state=args.random_state,
    )
    print("\nBest validation metrics:", {k: round(v, 4) for k, v in best_metrics.items()})
    print("Best params:", best_params)

    final_model = build_model(
        num_class=len(class_names),
        random_state=args.random_state,
        params=best_params,
    )
    final_model.fit(X_trainval, y_trainval)

    y_test_pred = final_model.predict(X_test)
    print("\nTest accuracy:", round(accuracy_score(y_test, y_test_pred), 4))
    print("\nTest classification report:\n")
    print(
        classification_report(
            y_test,
            y_test_pred,
            target_names=class_names,
            digits=4,
        )
    )

    confusion_percent_df = build_confusion_matrix_percent(
        y_true=y_test,
        y_pred=y_test_pred,
        class_names=class_names,
    )
    print("Confusion matrix (% by true class):")
    print(confusion_percent_df.round(2).to_string())

    per_class_diag = np.diag(confusion_percent_df.values)
    print("Per-class diagonal percentages:", [round(float(v), 2) for v in per_class_diag])

    save_outputs(
        model=final_model,
        class_names=class_names,
        feature_columns=X.columns.tolist(),
        confusion_percent_df=confusion_percent_df,
        pkl_out=args.pkl_out,
        confusion_csv_out=args.confusion_out,
        confusion_image_out=args.confusion_image_out,
    )

    print("\nSaved tuned model:", args.pkl_out)
    print("Saved tuned confusion matrix CSV:", args.confusion_out)
    print("Saved tuned confusion matrix image:", args.confusion_image_out)


if __name__ == "__main__":
    main()
