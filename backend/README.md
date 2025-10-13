# Urban Mobility Backend

This backend powers the Urban Mobility Data Explorer ETL and data API. It includes:

- A streaming ETL pipeline that extracts Parquet trip files, cleans them, and loads them into a relational database (tested with MariaDB/MySQL, but any SQLAlchemy-supported engine should work).
- SQLAlchemy ORM models for vendors, taxi zones, and trips.
- Utility scripts for running the pipeline and seeding the database.

## Prerequisites

- Python 3.12 (see `venv/` for the project virtual environment)
- MariaDB or MySQL server
- Taxi data parquet files under `backend/data/raw/`
- Taxi zone lookup CSV at `backend/data/cleaned/taxi_zone_lookup.csv`

## Installation

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Environment Configuration

Create `backend/.env` with:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=urban_mobility
```

These variables are picked up when running scripts (export them into the shell or pass `--env-file` when using uvicorn).

Ensure the target database exists (example for MariaDB/MySQL):

```sql
CREATE DATABASE urban_mobility CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Database Setup

Create tables using the SQLAlchemy models:

```bash
cd backend
set -a && source .env && set +a
PYTHONPATH="$(pwd)/.." venv/bin/python -m app.db.initialize
```

This will create the `vendors`, `locations`, and `trips` tables.

## Running the ETL Pipeline

The ETL extracts parquet trip data, produces `data/cleaned/extracted.csv`, and loads everything into the database:

```bash
cd backend
set -a && source .env && set +a
PYTHONPATH="$(pwd)/.." venv/bin/python -m etl
```

What happens:

1. Extract a sample (5 rows per parquet file) to keep the CSV manageable.
2. Transform columns, normalize IDs, enrich the dataset, and write `data/cleaned/extracted.csv`.
3. Load location, vendor, and trip tables in the configured database (existing rows cleared by default).

### Loading Existing Cleaned Data Only

If you already have `data/cleaned/extracted.csv` and just want to load it:

```bash
cd backend
set -a && source .env && set +a
PYTHONPATH="$(pwd)/.." venv/bin/python -m etl.load
```

Use `--no-reset` to append instead of truncating tables and `--batch-size` to adjust trip insert size.

## Directory Structure Highlights

- `app/models/` – SQLAlchemy ORM models (`Vendor`, `Location`, `Trip`).
- `app/db/` – DB engine/session configuration and table creation helper.
- `etl/` – extract, transform, load modules and pipeline entrypoint.
- `data/raw/` – source parquet files (place them here).
- `data/cleaned/` – CSV output and taxi zone lookup file.


## Troubleshooting

- **Database connection errors**: confirm environment variables are exported and the database server is reachable.
- **Missing tables**: rerun `app.db.initialize`.
- **Large dataset**: the default extractor samples from each parquet. Adjust `extract_data()` in `etl/extract.py` for broader coverage if needed.

## Next Steps

With the data loaded, you can build API endpoints in `app/routes/`, add analyses, or connect dashboards to the database schema defined by the ORM models.
