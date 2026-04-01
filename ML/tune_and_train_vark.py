import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, f1_score
from xgboost import XGBClassifier
import os

def tune_and_train():
    data_path = Path(__file__).resolve().parent / 'data' / 'processed' / 'vark_complete_dataset.csv'
    if not data_path.exists():
        print(f"Data not found at {data_path}")
        return

    df = pd.read_csv(data_path)
    X = df.drop(columns=['Learner'])
    y = df['Learner']

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # 80/20 Split
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)

    print("--- Training Robust VARK Classifier ---")
    
    # Regularized hyperparameter range
    param_dist = {
        'n_estimators': [100, 200, 300],
        'max_depth': [3, 4, 5], # Shallower trees for better generalization
        'learning_rate': [0.01, 0.05, 0.1],
        'subsample': [0.7, 0.8, 0.9], # More aggressive subsampling
        'colsample_bytree': [0.7, 0.8, 0.9],
        'reg_lambda': [1.0, 5.0, 10.0], # L2 regularization
        'reg_alpha': [0.1, 1.0, 5.0], # L1 regularization
        'min_child_weight': [1, 3, 5]
    }

    xgb = XGBClassifier(
        objective='multi:softprob',
        num_class=4,
        eval_metric='mlogloss',
        random_state=42,
        use_label_encoder=False
    )

    # Use RandomizedSearch
    search = RandomizedSearchCV(xgb, param_distributions=param_dist, n_iter=15, cv=5, scoring='accuracy', n_jobs=-1, random_state=42)
    search.fit(X_train, y_train)

    best_model = search.best_estimator_
    
    train_acc = accuracy_score(y_train, best_model.predict(X_train))
    test_acc = accuracy_score(y_test, best_model.predict(X_test))
    
    print(f"Best Parameters: {search.best_params_}")
    print(f"Train Accuracy: {train_acc:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Generalization Gap: {abs(train_acc - test_acc):.4f}")
    
    if abs(train_acc - test_acc) > 0.05:
        print("⚠️ WARNING: High Generalization Gap detected (>5%). Adjusting regularization further might be needed.")
    else:
        print("✅ Generalization Gap is healthy (<5%).")

    y_pred = best_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    print(f"Best Parameters: {search.best_params_}")
    print(f"Test Accuracy: {acc:.4f}")
    print(f"Weighted F1 Score: {f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Save model artifacts
    model_dir = Path(__file__).resolve().parent / 'models'
    model_dir.mkdir(parents=True, exist_ok=True)
    pkl_path = model_dir / 'vark_high_acc_model.pkl'
    
    with open(pkl_path, 'wb') as f:
        pickle.dump({
            'model': best_model,
            'label_classes': le.classes_.tolist(),
            'feature_columns': X.columns.tolist()
        }, f)
    
    print(f"Model saved successfully to {pkl_path}")

if __name__ == '__main__':
    tune_and_train()
