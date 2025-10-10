#!/usr/bin/env python3
import pyarrow.parquet as pq
import pandas as pd
from pathlib import Path


def extract_data(n_rows_per_file=5000):
    """
    Safely sample a few rows from each Parquet file without loading everything.
    """
    raw_dir = Path("data/raw")
    files = list(raw_dir.glob("*.parquet"))
    if not files:
        raise FileNotFoundError("No parquet files found in data/raw")

    print(f"Extracting data from {len(files)} file(s)...")
    df_list = []

    for f in files:
        parquet_file = pq.ParquetFile(f)

        # Read only the first batch or up to n_rows_per_file rows
        batches = []
        rows_read = 0
        for batch in parquet_file.iter_batches(batch_size=n_rows_per_file):
            batches.append(batch.to_pandas())
            rows_read += len(batch)
            if rows_read >= n_rows_per_file:
                break

        df_sample = pd.concat(batches, ignore_index=True)
        df_list.append(df_sample)

    df = pd.concat(df_list, ignore_index=True)
    print(f"Extracted {len(df):,} records.")
    return df




    



