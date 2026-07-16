import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier

def generate_balanced_8_question_vark(num_samples_per_class=2000):
    np.random.seed(42)
    styles = ['ReadWrite', 'Auditory', 'Kinesthetic', 'Visual']
    data = []
    
    # 8 highly discriminative features:
    # Q1-Q2: ReadWrite (Index 0-1)
    # Q3-Q4: Auditory (Index 2-3)
    # Q5-Q6: Kinesthetic (Index 4-5)
    # Q7-Q8: Visual (Index 6-7)
    
    for style_idx, style in enumerate(styles):
        for _ in range(num_samples_per_class):
            # Base response (Likert 1 to 5)
            answers = np.random.normal(2.2, 0.8, size=8).round().astype(int)
            answers = np.clip(answers, 1, 5)
            
            # Boost the dominant style's 2 questions
            focus_start = style_idx * 2
            focus_end = focus_start + 2
            
            for idx in range(focus_start, focus_end):
                answers[idx] = np.random.choice([4, 5], p=[0.25, 0.75])
                
            # Random subtle noise on 1 answer
            noise_idx = np.random.choice(range(8), size=1, replace=False)[0]
            if noise_idx < focus_start or noise_idx >= focus_end:
                answers[noise_idx] = np.random.randint(1, 6)
            
            data.append(list(answers) + [style])
            
    cols = [f"Q{i+1}" for i in range(8)] + ['Learner']
    df = pd.DataFrame(data, columns=cols)
    
    # Shuffle dataset
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df

def main():
    print("--- Training Fast 8-Question VARK Classifier ---")
    df = generate_balanced_8_question_vark()
    
    processed_dir = Path(__file__).resolve().parent / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    df.to_csv(processed_dir / "vark_balanced_8_dataset.csv", index=False)
    print(f"Dataset generated with {len(df)} samples across 8 discriminative questions.")
    
    X = df.drop(columns=['Learner'])
    y = df['Learner']
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    model = XGBClassifier(
        objective='multi:softprob',
        num_class=len(le.classes_),
        eval_metric='mlogloss',
        n_estimators=150,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        tree_method='hist',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    models_dir = Path(__file__).resolve().parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    pkl_out = models_dir / "vark_high_acc_model.pkl"
    
    with pkl_out.open("wb") as f:
        pickle.dump({
            "model": model,
            "label_classes": le.classes_.tolist(),
            "feature_columns": X.columns.tolist()
        }, f)
        
    print(f"8-Question Model bundle saved to {pkl_out}")

if __name__ == '__main__':
    main()
