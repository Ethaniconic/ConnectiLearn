import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier

def generate_balanced_16_question_vark(num_samples_per_class=2000):
    np.random.seed(42)
    styles = ['ReadWrite', 'Auditory', 'Kinesthetic', 'Visual']
    data = []
    
    # 16 features mapping:
    # Q1-Q4: ReadWrite (Index 0-3)
    # Q5-Q8: Auditory (Index 4-7)
    # Q9-Q12: Kinesthetic (Index 8-11)
    # Q13-Q16: Visual (Index 12-15)
    
    for style_idx, style in enumerate(styles):
        for _ in range(num_samples_per_class):
            # Base response (Likert 1 to 5) with a low/medium baseline score
            answers = np.random.normal(2.5, 0.9, size=16).round().astype(int)
            answers = np.clip(answers, 1, 5)
            
            # Boost the dominant style's 4 questions
            focus_start = style_idx * 4
            focus_end = focus_start + 4
            
            # Dominant questions get higher scores (mostly 4 and 5)
            for idx in range(focus_start, focus_end):
                answers[idx] = np.random.choice([4, 5], p=[0.35, 0.65])
                
            # Inject noise: randomly change 2 random answers across all questions
            noise_idx = np.random.choice(range(16), size=2, replace=False)
            for idx in noise_idx:
                if idx < focus_start or idx >= focus_end:
                    # noise on non-dominant questions can randomly go higher
                    answers[idx] = np.random.randint(1, 6)
            
            data.append(list(answers) + [style])
            
    cols = [f"Q{i+1}" for i in range(16)] + ['Learner']
    df = pd.DataFrame(data, columns=cols)
    
    # Shuffle dataset
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df

def main():
    print("--- Redesigning VARK Dataset to Balanced 16-Question Set ---")
    df = generate_balanced_16_question_vark()
    
    # Save the redesigned dataset
    processed_dir = Path(__file__).resolve().parent / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    df.to_csv(processed_dir / "vark_balanced_16_dataset.csv", index=False)
    print(f"Redesigned dataset saved with {len(df)} samples.")
    print("Class distribution:\n", df['Learner'].value_counts())
    
    X = df.drop(columns=['Learner'])
    y = df['Learner']
    
    # Encode target labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print("\nTraining XGBoost Classifier...")
    model = XGBClassifier(
        objective='multi:softprob',
        num_class=len(le.classes_),
        eval_metric='mlogloss',
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        tree_method='hist',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    # Save model pickle bundle
    models_dir = Path(__file__).resolve().parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    pkl_out = models_dir / "vark_high_acc_model.pkl"
    
    with pkl_out.open("wb") as f:
        pickle.dump({
            "model": model,
            "label_classes": le.classes_.tolist(),
            "feature_columns": X.columns.tolist()
        }, f)
        
    print(f"Balanced model pickle saved to {pkl_out}")

if __name__ == '__main__':
    main()
