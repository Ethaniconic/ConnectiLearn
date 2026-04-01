import sys
import pickle
import argparse
from pathlib import Path
import pandas as pd
import warnings
warnings.filterwarnings('ignore') # Suppress pandas warning about missing col names

def main():
    parser = argparse.ArgumentParser()
    # 20 questions answers
    for i in range(20):
        parser.add_argument(f'--q{i+1}', type=int, required=True)
    parser.add_argument('--model-path', type=Path, default=Path(__file__).resolve().parent / 'models' / 'vark_high_acc_model.pkl')
    args = parser.parse_args()
    
    with open(args.model_path, "rb") as f:
        bundle = pickle.load(f)
        
    model = bundle['model']
    classes = bundle['label_classes']
    cols = bundle['feature_columns']
    
    # gather args into dataframe
    row = [getattr(args, f"q{i+1}") for i in range(20)]
    df = pd.DataFrame([row], columns=cols)
    
    pred_idx = model.predict(df)[0]
    
    # Map the dataset "V/A/R/K" notation to the full words the backend expects
    class_map = {'V': 'Visual', 'A': 'Auditory', 'R': 'ReadWrite', 'K': 'Kinesthetic'}
    predicted_char = str(classes[pred_idx]).strip()
    full_prediction = class_map.get(predicted_char, predicted_char)
    print(full_prediction)

if __name__ == '__main__':
    main()
