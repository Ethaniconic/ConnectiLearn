import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import sys

def evaluate():
    model_path = Path(__file__).resolve().parent / 'models' / 'vark_high_acc_model.pkl'
    data_path = Path(__file__).resolve().parent / 'data' / 'processed' / 'vark_complete_dataset.csv'
    
    if not model_path.exists() or not data_path.exists():
        print("Missing model or data files.")
        return

    with open(model_path, 'rb') as f:
        bundle = pickle.load(f)
    
    model = bundle['model']
    le_classes = bundle['label_classes']

    df = pd.read_csv(data_path)
    X = df.drop(columns=['Learner'])
    y = df['Learner']
    
    # Map labels to numeric for the model if needed (XGBoost handles it if trained that way)
    # But wait, the model was trained on y_encoded. 
    # Let's just use the train/test split from 42 to see the gap.
    
    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    le.fit(le_classes)
    y_encoded = le.transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    
    print(f"Train Accuracy: {train_acc:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Gap: {abs(train_acc - test_acc):.4f}")

    if train_acc > 0.99 and test_acc > 0.99:
        print("\n--- Testing on Noisy 'Fuzzy' Data ---")
        # Generate 500 samples with noise (fuzzy)
        noisy_data = []
        # Style order in 20-feature model: R, A, K, V
        for _ in range(500):
            style_idx = np.random.randint(0, 4)
            ans = np.random.randint(1, 6, size=20) # Start random
            # Add a bias (4-5) to 3 out of 5 style-specific questions
            focus = style_idx * 5
            lucky_indices = np.random.choice(range(focus, focus+5), 3, replace=False)
            for idx in lucky_indices:
                ans[idx] = np.random.randint(4, 6)
            noisy_data.append(list(ans) + [le_classes[style_idx]])
        
        noisy_df = pd.DataFrame(noisy_data, columns=list(X.columns) + ['Learner'])
        X_noisy = noisy_df.drop(columns=['Learner'])
        y_noisy = le.transform(noisy_df['Learner'])
        
        noisy_acc = accuracy_score(y_noisy, model.predict(X_noisy))
        print(f"Noisy Data (Fuzzy) Accuracy: {noisy_acc:.4f}")
        
        if noisy_acc < 0.70:
            print("⚠️ POTENTIAL OVERFITTING: Model fails on high noise data.")
        else:
            print("✅ Model seems robust to noise.")

if __name__ == '__main__':
    evaluate()
