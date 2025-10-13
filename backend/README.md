# urban-mobility-data-explorer

## Overview

This repository contains a small ETL pipeline and a FastAPI backend for exploring urban mobility data.

Directory layout (relevant parts):

- `backend/` - Python backend, ETL scripts, FastAPI app and database schema.
- `data/` - raw and cleaned data used by the ETL.
- `frontend/` - simple static front-end files (HTML, JS, CSS).

## Requirements

- Python 3.10+ (the project was developed against Python 3.10/3.11; newer versions should work but confirm locally).
- A virtual environment is recommended.
- Required Python packages are in `backend/requirements.txt`.

## Setup (Windows PowerShell)

Open PowerShell and run the following from the repository root.

1. Create and activate a virtual environment (from repo root):

```powershell
python -m venv .\venv
.\venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r .\backend\requirements.txt
```

3. Create or verify environment variables

The backend reads environment variables from `backend/.env`. If you have a `.env` file already, you can load it into your PowerShell session with the following command (this sets variables for the current session only):

```powershell
Get-Content backend\.env | ForEach-Object {
	if ($_ -and $_ -notmatch '^[\s#]') {
		$key, $value = $_ -split '=', 2
		Set-Item "env:$key" $value
	}
}
```

Adjust `backend/.env` if you need to change DB paths or other settings.

## Running the ETL

From the `backend` directory, run the ETL (extract → transform → load) which populates the database used by the FastAPI app.

```powershell
cd .\backend
python -m backend.etl
```

What this does:
- Executes `backend/etl/__main__.py` (module `backend.etl`).
- The ETL will read raw data in `backend/data/raw` (or `data/raw` depending on configuration), run cleaning and transforms, and load results into the local database defined in `backend/.env` or the default config in `backend/db/config.py`.

If you need to re-run the ETL multiple times, the script is idempotent where possible; check the ETL logs in `backend/data/logs/` or console output for details.

## Starting the FastAPI server (development)

After the ETL has populated the database, start the FastAPI server from the `backend` directory.

```powershell
cd .\backend
python .\app\main.py
```

Alternative using uvicorn (gives automatic reload during development):

```powershell
cd .\backend
python -m uvicorn backend.app.main:app --reload --env-file backend/.env
```

Notes:
- Using `python .\app\main.py` runs the same application module directly. If the app uses `if __name__ == "__main__":` to start uvicorn, this will launch the server.
- Using `uvicorn` with `--reload` enables hot-reload for development.
- The `--env-file backend/.env` option ensures uvicorn loads environment variables from the `.env` file.

The API will be reachable at http://127.0.0.1:8000 by default (unless overridden by environment variables). You can open the interactive API docs at:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Quick troubleshooting

- If you see import errors, ensure the virtualenv is activated and `backend/requirements.txt` was installed.
- If the database file is missing or the ETL fails, inspect `backend/db/config.py` and `backend/.env` for the DB path.
- On Windows PowerShell, if you get an execution policy error when running `Activate.ps1`, run PowerShell as Administrator and set the policy temporarily:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

- If ports are in use, change the host/port via uvicorn options, for example: `--host 0.0.0.0 --port 8080`.

## Development notes

- Tests: see `tests/` for unit tests. You can run these with `pytest` from the repository root (after installing dev requirements if any):

```powershell
pytest -q
```

- The project layout places the FastAPI app in `backend/app/main.py` and DB schema in `backend/db/schema.sql`.

## Summary

1. From `backend`: `python -m backend.etl` — runs ETL and loads the DB.
2. From `backend`: `python .\app\main.py` — starts FastAPI server (or use uvicorn as shown above).


# urban-mobility-data-explorer

## Environment variables

The backend reads configuration from `backend/.env` when present. For convenience an example file is included at `backend/.env.example` — copy it and fill in the values before running the ETL or server:

```powershell
cp backend\.env.example backend\.env
# then edit backend\.env in your editor
```

Important variables:

- `DATABASE_URL` (optional): a full SQLAlchemy-compatible database URL (e.g. `mysql+pymysql://user:pass@host:3306/dbname`). If present, it overrides the individual DB_* variables.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: used to build a MySQL connection URL when `DATABASE_URL` is not set.

Examples:

- MySQL using individual variables:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=s3cr3t
DB_NAME=urban_mobility
```

- Or set a single `DATABASE_URL`:

```
DATABASE_URL=mysql+pymysql://root:s3cr3t@localhost:3306/urban_mobility
```

If your project uses Postgres instead of MySQL, provide the suitable `DATABASE_URL` (for example `postgresql+psycopg2://user:pass@host:5432/dbname`) and ensure the appropriate DB driver is installed (`psycopg2-binary` is already in `requirements.txt`).

## Complete step-by-step (Windows PowerShell)

The following section collects all the commands and variations shown during development so you can reproduce the exact workflows you used earlier.

Choose one workflow below.

A) Recommended — virtual environment at repository root

```powershell
# from repository root
python -m venv .\venv
.\venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt

# copy example env and edit
cp backend\.env.example backend\.env
# edit backend\.env using your editor and set DB_* or DATABASE_URL

# run ETL (from repo root)
python -m backend.etl

# start FastAPI (option 1 - direct module run)
python .\backend\app\main.py

# start with uvicorn (option 2 - reload + load env file automatically)
python -m uvicorn backend.app.main:app --reload --env-file backend/.env

# when finished
deactivate
```

B) Alternative — virtual environment inside `backend/` (this mirrors your command history)

If you prefer to create the venv inside `backend/` (some contributors do this), follow these steps. Note: when running from inside `backend/`, set `PYTHONPATH` so Python can import the `backend` package from its parent directory.

```powershell
# from repository root or any folder, switch to backend
cd .\backend

# create venv inside backend
python -m venv venv
.\venv\Scripts\Activate.ps1

# install from backend/requirements.txt
pip install -r .\requirements.txt

# copy and edit env
cp .\.env.example .\.env
# or copy from repo root: cp ..\backend\.env.example .\backend\.env

# IMPORTANT: make sure package imports resolve when running module by setting PYTHONPATH to repo root
$env:PYTHONPATH = (Get-Location).Path + "\.."

# run ETL while in backend (this will run package module `backend.etl` using repo root on PYTHONPATH)
python -m backend.etl

# start server - direct run
python .\app\main.py

# or start with uvicorn executable from the venv (same effect)
.\venv\Scripts\uvicorn.exe backend.app.main:app --reload

# when finished
deactivate
```

Notes about `PYTHONPATH` and where to run
- Running `python -m backend.etl` or `python -m uvicorn backend.app.main:app` expects the repository root to be on Python's import path so the `backend` package can be found. That is why setting `PYTHONPATH` to the parent directory is useful when your current working directory is `backend/`.
- Alternatively, run the commands from the repository root and you won't need to set `PYTHONPATH`.

Loading environment variables into the current PowerShell session
```powershell
Get-Content backend\.env | ForEach-Object {
	if ($_ -and $_ -notmatch '^[\s#]') {
		$key, $value = $_ -split '=', 2
		Set-Item "env:$key" $value
	}
}
```

Quick reference: what each command does
- `python -m backend.etl` — runs the ETL pipeline (extract → transform → write cleaned CSV → load into DB).
- `python .\backend\app\main.py` — runs the FastAPI app directly; `main.py` will call uvicorn if run as __main__.
- `python -m uvicorn backend.app.main:app --reload --env-file backend/.env` — starts uvicorn with auto-reload and loads `.env` automatically.

Running tests

```powershell
# from repository root (after installing requirements)
pytest -q
```

Common troubleshooting
- Execution policy prevents Activate.ps1: run PowerShell as Administrator or set temporary bypass:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

- Module import errors (ModuleNotFoundError: No module named 'backend'): ensure you either run from the repo root or set `PYTHONPATH` when running from `backend/`.
- ETL file not found errors: ensure your raw parquet files are in `backend/data/raw/` (or `data/raw/` depending on where you run the script) and that you ran the ETL from the correct working directory.
- Database connection errors: check `backend/.env` values and `backend/app/db/config.py`. Use `DATABASE_URL` for a full connection string if you prefer.
