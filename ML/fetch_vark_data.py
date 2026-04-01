import pandas as pd
import numpy as np
from pathlib import Path
import argparse

def generate_synthetic_vark(num_samples: int, output_path: Path):
    np.random.seed(42)
    styles = ['Visual', 'Auditory', 'ReadWrite', 'Kinesthetic']
    
    data = []
    
    for _ in range(num_samples):
        # Pick a true dominant style for this student
        true_style_idx = np.random.choice(4)
        
        # Probabilities for picking an answer that matches V, A, R, or K.
        # The dominant style gets a much higher weight.
        probs = [0.15, 0.15, 0.15, 0.15]
        probs[true_style_idx] = 0.55
        
        # 16 questions. For each question, student picks an answer class index (0=V, 1=A, 2=R, 3=K)
        answers = np.random.choice(4, size=16, p=probs)
        
        # Determine the label simply by max tally (this is how VARK actually works)
        counts = np.bincount(answers, minlength=4)
        assigned_style = styles[np.argmax(counts)]
        
        row = list(answers) + [assigned_style]
        data.append(row)
        
    cols = [f"Q{i+1}" for i in range(16)] + ['LearningStyle']
    df = pd.DataFrame(data, columns=cols)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} synthetic VARK records at {output_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', type=int, default=10000)
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parent / 'data' / 'processed' / 'vark_dataset.csv')
    args = parser.parse_args()
    
    generate_synthetic_vark(args.samples, args.out)
