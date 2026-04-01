from __future__ import annotations

import argparse
import pickle
from pathlib import Path

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
        "xgboost is required. Install with: pip install xgboost scikit-learn pandas"
    ) from exc


def load_dataset(data_path: Path) -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(data_path)
    if "LearningStyle" not in df.columns:
        raise ValueError("LearningStyle column not found in dataset.")

    y = df["LearningStyle"]
    X = df.drop(columns=["LearningStyle"])

    # One-hot encode any non-numeric columns if present.
    X = pd.get_dummies(X, drop_first=False)
    return X, y


def train_model(
    X: pd.DataFrame,
    y: pd.Series,
    args: argparse.Namespace,
) -> tuple[XGBClassifier, LabelEncoder, pd.Series, pd.Series]:
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y_encoded,
    )

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=len(label_encoder.classes_),
        eval_metric="mlogloss",
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.learning_rate,
        subsample=args.subsample,
        colsample_bytree=args.colsample_bytree,
        tree_method="hist",
        random_state=args.random_state,
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    print("Accuracy:", round(accuracy_score(y_test, y_pred), 4))
    print("\nClassification report:\n")
    print(
        classification_report(
            y_test,
            y_pred,
            target_names=label_encoder.classes_,
            digits=4,
        )
    )

    return model, label_encoder, pd.Series(y_test), pd.Series(y_pred)


def build_confusion_matrix_percent(
    y_true: pd.Series,
    y_pred: pd.Series,
    class_names: list[str],
) -> pd.DataFrame:
    cm = confusion_matrix(y_true, y_pred, labels=range(len(class_names)))
    row_totals = cm.sum(axis=1, keepdims=True)
    # Avoid division by zero for any class absent in y_true.
    row_totals[row_totals == 0] = 1
    cm_percent = (cm / row_totals) * 100.0

    return pd.DataFrame(
        cm_percent,
        index=[f"true_{name}" for name in class_names],
        columns=[f"pred_{name}" for name in class_names],
    )


def save_artifacts(
    model: XGBClassifier,
    label_encoder: LabelEncoder,
    feature_columns: list[str],
    confusion_percent_df: pd.DataFrame,
    pkl_path: Path,
    confusion_csv_path: Path,
    confusion_image_path: Path,
) -> None:
    pkl_path.parent.mkdir(parents=True, exist_ok=True)
    with pkl_path.open("wb") as f:
        pickle.dump(
            {
                "model": model,
                "label_classes": label_encoder.classes_.tolist(),
                "feature_columns": feature_columns,
            },
            f,
        )

    confusion_csv_path.parent.mkdir(parents=True, exist_ok=True)
    confusion_percent_df.to_csv(confusion_csv_path, float_format="%.4f")

    confusion_image_path.parent.mkdir(parents=True, exist_ok=True)
    plt.figure(figsize=(9, 7))
    sns.heatmap(
        confusion_percent_df,
        annot=True,
        fmt=".2f",
        cmap="Blues",
        cbar_kws={"label": "Percentage"},
    )
    plt.title("Confusion Matrix (%)")
    plt.xlabel("Predicted Class")
    plt.ylabel("True Class")
    plt.tight_layout()
    plt.savefig(confusion_image_path, dpi=200)
    plt.close()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train XGBoost model for learner type.")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path(__file__).resolve().parent / "data" / "processed" / "questionnaire.csv",
        help="Path to questionnaire dataset CSV.",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Test set fraction.",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed.",
    )
    parser.add_argument("--n-estimators", type=int, default=300)
    parser.add_argument("--max-depth", type=int, default=6)
    parser.add_argument("--learning-rate", type=float, default=0.1)
    parser.add_argument("--subsample", type=float, default=0.9)
    parser.add_argument("--colsample-bytree", type=float, default=0.9)
    parser.add_argument(
        "--pkl-out",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "xgb_model.pkl",
        help="Path to save pickled model bundle.",
    )
    parser.add_argument(
        "--confusion-out",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "confusion_matrix_percent.csv",
        help="Path to save confusion matrix percentages CSV.",
    )
    parser.add_argument(
        "--confusion-image-out",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "confusion_matrix_percent.png",
        help="Path to save confusion matrix heatmap image.",
    )
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    if not args.data.exists():
        raise SystemExit(f"Dataset not found: {args.data}")

    X, y = load_dataset(args.data)
    model, label_encoder, y_test, y_pred = train_model(X, y, args)
    confusion_percent_df = build_confusion_matrix_percent(
        y_true=y_test,
        y_pred=y_pred,
        class_names=label_encoder.classes_.tolist(),
    )

    print("Confusion matrix (% by true class):")
    print(confusion_percent_df.round(2).to_string())

    save_artifacts(
        model,
        label_encoder,
        X.columns.tolist(),
        confusion_percent_df,
        args.pkl_out,
        args.confusion_out,
        args.confusion_image_out,
    )
    print("Saved pickle model bundle:", args.pkl_out)
    print("Saved confusion matrix (%):", args.confusion_out)
    print("Saved confusion matrix image:", args.confusion_image_out)


if __name__ == "__main__":
    main()
