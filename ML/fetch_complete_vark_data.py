import pandas as pd
import numpy as np
from pathlib import Path

def generate_balanced_vark(num_samples_per_class=2000):
    np.random.seed(42)
    styles = ['Visual', 'Auditory', 'ReadWrite', 'Kinesthetic']
    
    # 20 questions (5 of each style):
    # Questions 1-5: Read/Write (Index 0-4)
    # Questions 6-10: Auditory (Index 5-9)
    # Questions 11-15: Kinesthetic (Index 10-14)
    # Questions 16-20: Visual (Index 15-19)
    
    data = []
    
    # Mapping styles to question blocks in Questionnaire.jsx
    # 0: ReadWrite, 1: Auditory, 2: Kinesthetic, 3: Visual
    style_order = ['ReadWrite', 'Auditory', 'Kinesthetic', 'Visual']
    
    for style_idx, style in enumerate(style_order):
        for _ in range(num_samples_per_class):
            # Base answers (1-5 Likert scale)
            answers = np.random.normal(3, 1.0, size=20).round().astype(int)
            answers = np.clip(answers, 1, 5)
            
            # Signal for dominant style (5 questions per style)
            focus_start = style_idx * 5
            focus_end = focus_start + 5
            
            # Boost the dominant style: 4 out of 5 questions get a strong signal
            boost_indices = np.random.choice(range(focus_start, focus_end), size=4, replace=False)
            for idx in boost_indices:
                answers[idx] = np.random.randint(4, 6) # 4 or 5
            
            # Subtler noise: randomly flip 2 answers completely
            noise_indices = np.random.choice(range(20), size=2, replace=False)
            for idx in noise_indices:
                answers[idx] = np.random.randint(1, 6)
            
            data.append(list(answers) + [style])
            
    cols = [f"Q{i+1}" for i in range(20)] + ['Learner']
    df = pd.DataFrame(data, columns=cols)
    
    # Shuffle the dataset
    df = df.sample(frac=1).reset_index(drop=True)
    
    out_path = Path(__file__).resolve().parent / 'data' / 'processed' / 'vark_complete_dataset.csv'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} balanced 20-feature VARK samples at {out_path}")
    print("Class distribution:")
    print(df['Learner'].value_counts())

if __name__ == '__main__':
    generate_balanced_vark()
