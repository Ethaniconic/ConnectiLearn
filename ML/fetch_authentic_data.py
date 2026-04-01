import pandas as pd
from pathlib import Path
import argparse
import requests
import io

def fetch_data(output_path: Path):
    url = "https://raw.githubusercontent.com/hefrijunt/ml_vark_learning_style/main/dataset/vark_dataset.csv"
    print(f"Downloading authentic research dataset from {url}...")
    
    response = requests.get(url)
    response.raise_for_status()
    
    df = pd.read_csv(io.StringIO(response.text))
    
    print("\nDataset Shape:", df.shape)
    print("Columns:", df.columns.tolist())
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nSaved {len(df)} authentic records to {output_path}")
    
    print("\nSample Data:")
    print(df.head())

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parent / 'data' / 'processed' / 'vark_authentic_dataset.csv')
    args = parser.parse_args()
    fetch_data(args.out)
