#!/usr/bin/env python3
from pathlib import Path
from .extract import extract_data
from .transform import transform_data
from .load import main as load_main

def main():
    df = extract_data()
    df = transform_data(df)
    output_path = Path("data/cleaned/extracted.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Saved cleaned data to {output_path}, with {len(df.columns):,} columns.")
    load_main()
