import argparse
import pickle
from pathlib import Path
import pandas as pd
import seaborn as sns
from matplotlib import pyplot as plt
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

def load_vark(data_path: Path):
    df = pd.read_csv(data_path)
    if 'Learner' not in df.columns:
        raise ValueError("Missing 'Learner' column.")
    y = df['Learner']
    
    # Drop target and demographic columns to train pure questionnaire features
    cols_to_drop = ['Learner']
    if 'Gender' in df.columns: cols_to_drop.append('Gender')
    if 'Age' in df.columns: cols_to_drop.append('Age')
        
    X = df.drop(columns=cols_to_drop)
    return X, y

def train_and_evaluate(X, y, args):
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=args.test_size, random_state=args.random_state, stratify=y_encoded
    )
    
    model = XGBClassifier(
        objective='multi:softprob',
        num_class=len(le.classes_),
        eval_metric='mlogloss',
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=args.random_state,
        use_label_encoder=False
    )
    
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    return model, le, y_test, y_pred

def save_artifacts(model, le, X_columns, y_test, y_pred, args):
    args.pkl_out.parent.mkdir(parents=True, exist_ok=True)
    with args.pkl_out.open("wb") as f:
        pickle.dump({
            "model": model,
            "label_classes": le.classes_.tolist(),
            "feature_columns": X_columns
        }, f)
        
    cm = confusion_matrix(y_test, y_pred, labels=range(len(le.classes_)))
    cm_percent = (cm / cm.sum(axis=1, keepdims=True)) * 100.0
    import numpy as np
    cm_percent = np.nan_to_num(cm_percent) # Handle division by zero
    df_cm = pd.DataFrame(cm_percent, index=le.classes_, columns=le.classes_)
    
    plt.figure(figsize=(8,6))
    sns.heatmap(df_cm, annot=True, fmt=".2f", cmap="Blues")
    plt.title("Authentic VAK Confusion Matrix (%)")
    plt.ylabel("True Class")
    plt.xlabel("Predicted Class")
    plt.tight_layout()
    args.cm_img_out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(args.cm_img_out)
    plt.close()
    
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, default=Path(__file__).resolve().parent / 'data' / 'processed' / 'vark_authentic_dataset.csv')
    parser.add_argument('--pkl-out', type=Path, default=Path(__file__).resolve().parent / 'models' / 'vark_authentic_model.pkl')
    parser.add_argument('--cm-img-out', type=Path, default=Path(__file__).resolve().parent / 'models' / 'vark_authentic_confusion_matrix.png')
    parser.add_argument('--test-size', type=float, default=0.2)
    parser.add_argument('--random-state', type=int, default=42)
    args = parser.parse_args()
    
    X, y = load_vark(args.data)
    model, le, y_test, y_pred = train_and_evaluate(X, y, args)
    save_artifacts(model, le, X.columns.tolist(), y_test, y_pred, args)
    print(f"Files saved to {args.pkl_out.parent}")
