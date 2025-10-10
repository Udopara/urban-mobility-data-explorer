#!/usr/bin/env python3
import pyarrow.parquet as pq
import pandas as pd
from pathlib import Path
from .extract import extract_data
from .transform import transform_data

def main():
    df = extract_data()
    df = transform_data(df)
    output_path = Path("data/cleaned/extracted.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"✅ Saved cleaned data to {output_path}, with {len(df.columns):,} columns.")
