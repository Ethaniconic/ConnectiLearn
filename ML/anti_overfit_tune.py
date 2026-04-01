from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib import pyplot as plt
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier


def main() -> None:
    root = Path(__file__).resolve().parent
    data_path = root / "data" / "processed" / "questionnaire.csv"
    models_dir = root / "models"

    raw = pd.read_csv(data_path)
    y = raw["LearningStyle"]
    X = pd.get_dummies(raw.drop(columns=["LearningStyle"]), drop_first=False)

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    class_names = encoder.classes_.tolist()

    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.2,
        random_state=42,
        stratify=y_encoded,
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval,
        y_trainval,
        test_size=0.2,
        random_state=42,
        stratify=y_trainval,
    )

    rng = np.random.default_rng(123)
    space = {
        "n_estimators": [400, 600, 800, 1000],
        "max_depth": [4, 5, 6, 7],
        "learning_rate": [0.03, 0.05, 0.07],
        "subsample": [0.75, 0.85, 0.95],
        "colsample_bytree": [0.7, 0.8, 0.9],
        "min_child_weight": [1, 2, 3, 5],
        "gamma": [0.0, 0.1, 0.2, 0.4],
        "reg_lambda": [1.0, 1.5, 2.0, 3.0],
        "reg_alpha": [0.0, 0.1, 0.2, 0.4],
    }

    def sample_params() -> dict[str, float | int]:
        params: dict[str, float | int] = {}
        for key, values in space.items():
            value = rng.choice(values)
            params[key] = value.item() if hasattr(value, "item") else value
        return params

    best: dict[str, object] | None = None
    trials = 30

    print("Running anti-overfit hyperparameter search...")
    for trial in range(1, trials + 1):
        params = sample_params()
        model = XGBClassifier(
            objective="multi:softprob",
            num_class=len(class_names),
            eval_metric="mlogloss",
            tree_method="hist",
            random_state=42,
            **params,
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

        y_train_pred = model.predict(X_train)
        y_val_pred = model.predict(X_val)

        train_acc = float(accuracy_score(y_train, y_train_pred))
        val_acc = float(accuracy_score(y_val, y_val_pred))
        gap = train_acc - val_acc

        cm = confusion_matrix(y_val, y_val_pred, labels=range(len(class_names)))
        recalls = np.diag(cm) / np.maximum(cm.sum(axis=1), 1)
        min_recall = float(recalls.min())
        mean_recall = float(recalls.mean())

        candidate = {
            "params": params,
            "train_acc": train_acc,
            "val_acc": val_acc,
            "gap": gap,
            "min_recall": min_recall,
            "mean_recall": mean_recall,
        }

        if best is None:
            best = candidate
        else:
            old_key = (
                best["val_acc"],
                best["min_recall"],
                -best["gap"],
                best["mean_recall"],
            )
            new_key = (
                candidate["val_acc"],
                candidate["min_recall"],
                -candidate["gap"],
                candidate["mean_recall"],
            )
            if new_key > old_key:
                best = candidate

        if trial % 10 == 0:
            print(
                f"trial={trial:02d} best_val={best['val_acc']:.4f} "
                f"best_min_recall={best['min_recall']:.4f} best_gap={best['gap']:.4f}"
            )

    if best is None:
        raise RuntimeError("No candidate was evaluated.")

    print("Best candidate:", best)

    final_model = XGBClassifier(
        objective="multi:softprob",
        num_class=len(class_names),
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=42,
        **best["params"],
    )
    final_model.fit(X_trainval, y_trainval, verbose=False)

    y_trainval_pred = final_model.predict(X_trainval)
    y_test_pred = final_model.predict(X_test)

    trainval_acc = float(accuracy_score(y_trainval, y_trainval_pred))
    test_acc = float(accuracy_score(y_test, y_test_pred))
    generalization_gap = trainval_acc - test_acc

    cm_test = confusion_matrix(y_test, y_test_pred, labels=range(len(class_names)))
    cm_percent = (cm_test / np.maximum(cm_test.sum(axis=1, keepdims=True), 1)) * 100.0

    if trainval_acc < 0.88 and test_acc < 0.88:
        verdict = "underfitted"
    elif generalization_gap >= 0.03:
        verdict = "overfitted"
    else:
        verdict = "well-tuned"

    print(f"trainval_accuracy={trainval_acc:.4f}")
    print(f"test_accuracy={test_acc:.4f}")
    print(f"generalization_gap={generalization_gap:.4f}")
    print(f"verdict={verdict}")

    diagonal = np.diag(cm_percent)
    print("Per-class recall (%):")
    for cls, pct in zip(class_names, diagonal):
        print(f"  {cls}: {pct:.2f}%")

    models_dir.mkdir(parents=True, exist_ok=True)
    pkl_out = models_dir / "xgb_model_regularized.pkl"
    csv_out = models_dir / "confusion_matrix_regularized_percent.csv"
    png_out = models_dir / "confusion_matrix_regularized_percent.png"

    with pkl_out.open("wb") as f:
        pickle.dump(
            {
                "model": final_model,
                "label_classes": class_names,
                "feature_columns": X.columns.tolist(),
                "metrics": {
                    "trainval_accuracy": trainval_acc,
                    "test_accuracy": test_acc,
                    "generalization_gap": generalization_gap,
                    "verdict": verdict,
                    "best_params": best["params"],
                },
            },
            f,
        )

    cm_df = pd.DataFrame(
        cm_percent,
        index=[f"true_{name}" for name in class_names],
        columns=[f"pred_{name}" for name in class_names],
    )
    cm_df.to_csv(csv_out, float_format="%.4f")

    plt.figure(figsize=(9, 7))
    sns.heatmap(cm_df, annot=True, fmt=".2f", cmap="Blues", cbar_kws={"label": "Percentage"})
    plt.title("Regularized XGBoost Confusion Matrix (%)")
    plt.xlabel("Predicted Class")
    plt.ylabel("True Class")
    plt.tight_layout()
    plt.savefig(png_out, dpi=200)
    plt.close()

    print("Saved regularized model:", pkl_out)
    print("Saved regularized confusion CSV:", csv_out)
    print("Saved regularized confusion image:", png_out)


if __name__ == "__main__":
    main()
