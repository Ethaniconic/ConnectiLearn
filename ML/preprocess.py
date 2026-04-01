from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
OUTPUT_DIR = DATA_DIR / "processed"


def normalize_learning_style(value: str) -> str | None:
    if pd.isna(value):
        return None
    value = str(value).strip()
    mapping = {
        "Visual": "Visual",
        "visual": "Visual",
        "Auditory": "Auditory",
        "auditory": "Auditory",
        "Kinesthetic": "Kinesthetic",
        "kinesthetic": "Kinesthetic",
        "ReadWrite": "ReadWrite",
        "Read/Write": "ReadWrite",
    }
    return mapping.get(value)


def preprocess_questionnaire(input_path: Path, output_path: Path) -> None:
    df = pd.read_csv(input_path)

    if "LearningStyle" not in df.columns:
        raise ValueError("LearningStyle column not found in questionnaire data.")

    if pd.api.types.is_numeric_dtype(df["LearningStyle"]):
        numeric_to_label = {
            0: "Auditory",
            1: "Kinesthetic",
            2: "ReadWrite",
            3: "Visual",
        }
        df["LearningStyle"] = df["LearningStyle"].map(numeric_to_label)
    else:
        df["LearningStyle"] = df["LearningStyle"].map(normalize_learning_style)

    df = df.dropna(subset=["LearningStyle"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)


def preprocess_vak_text(input_path: Path, output_path: Path) -> None:
    df = pd.read_csv(input_path)
    if "Type" not in df.columns:
        raise ValueError("Type column not found in VAK text data.")

    df["LearningStyle"] = df["Type"].map(normalize_learning_style)
    df = df.dropna(subset=["LearningStyle"])
    df = df[["Sentence", "LearningStyle"]]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)


if __name__ == "__main__":
    preprocess_questionnaire(
        DATA_DIR / "merged-data.csv",
        OUTPUT_DIR / "questionnaire.csv",
    )
    preprocess_vak_text(
        DATA_DIR / "vak-data.csv",
        OUTPUT_DIR / "vak_text.csv",
    )
    print("Preprocessing complete. Output in:", OUTPUT_DIR)