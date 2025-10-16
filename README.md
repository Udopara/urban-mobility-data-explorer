### Urban Mobility Data Explorer

Explore and analyze urban mobility trip data with a lightweight stack:

- Backend: FastAPI + ETL pipeline (Python) to ingest, transform, and serve data
- Frontend: Static HTML/CSS/JS dashboard with charts, filters, tables

---

## Repository structure

- `backend/` — FastAPI app, ETL pipeline, data files, tests
  - `app/` — API application (`main.py`), models, schemas, utils
  - `etl/` — `extract.py`, `transform.py`, `load.py`, entrypoint `__main__.py`
  - `data/` — `raw/` parquet inputs, `cleaned/` CSV outputs, `logs/`
  - `requirements.txt` — Python dependencies
  - `tests/` — API and ETL tests
- `frontend/` — static client app
  - `index.html` — UI shell and sections
  - `css/styles.css` — design system and components
  - `js/main.js` — app logic, API calls, rendering
  - `js/charts.js` — Chart.js visualizations

---

## Prerequisites

- Python 3.10+ (3.10/3.11 recommended)
- Windows PowerShell (or your preferred shell)
- Optional: a simple HTTP server to serve the frontend (e.g., `python -m http.server`)

---

## Backend: setup and run

From the repository root (recommended workflow):

```powershell
# Create and activate a virtual environment
python -m venv .\venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r .\backend\requirements.txt

# (Optional) Configure environment vars
cp backend\.env.example backend\.env
# edit backend\.env to set DB connection (DB_* or DATABASE_URL)
```

### Run ETL (populate the database)

```powershell
python -m backend.etl
```

This runs `backend/etl/__main__.py` which reads parquet files from `backend/data/raw/`, cleans/transforms, writes cleaned CSVs to `backend/data/cleaned/`, and loads into the configured database (see `backend/app/db/config.py`).

### Start the API server

Option A — run the app module directly:

```powershell
python .\backend\app\main.py
```

Option B — use uvicorn with reload:

```powershell
python -m uvicorn backend.app.main:app --reload --env-file backend/.env
```

Default address: `http://127.0.0.1:8000`

Interactive docs:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### Key API endpoints (consumed by the frontend)

- `GET /api/insights/overview` → `{ total_trips, unique_vendors, unique_locations, avg_base_fare }`
- `GET /api/trips/summary` → `{ total_revenue, avg_trip_duration_minutes }`
- `GET /api/vendors` → `[{ vendor_id, vendor_name? }, ...]`
- `GET /api/locations?limit&offset` → `[{ location_id, borough?, zone? }, ...]`
- `GET /api/trips?limit&offset&vendor_id&search&start_date&end_date&sort_by&sort_order` → trips list used by the table
- `GET /api/insights/top-vendors?limit` → `[{ vendor_id, trip_count, total_revenue }, ...]`

Adjust paths/fields as needed if your backend differs.

---

## Frontend: run and configure

The frontend is static and dependency-free. You can open `frontend/index.html` directly, but using a local HTTP server is recommended.

```powershell
# from repository root
cd .\frontend
python -m http.server 5500
# open http://localhost:5500/
```

The frontend expects the backend at `http://127.0.0.1:8000/api`. Change this in `frontend/js/main.js` if needed:

```js
// frontend/js/main.js
this.apiBase = 'http://127.0.0.1:8000/api';
```

Charts are rendered with Chart.js loaded via CDN in `index.html`.

For detailed UI behavior and customization (theme, page sizes, sorting keys, chart colors), see `frontend/README.md`.

---

## Common workflows

1) End-to-end local run

```powershell
# Setup virtualenv and install deps
python -m venv .\venv
.\venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt

# Prepare environment
cp backend\.env.example backend\.env
# edit backend\.env to set DB connection (or use defaults)

# Load data
python -m backend.etl

# Start API
python -m uvicorn backend.app.main:app --reload --env-file backend/.env

# Serve frontend (new terminal)
cd frontend
python -m http.server 5500
```

2) Run tests

```powershell
# from repo root
pytest -q
```

---

## Troubleshooting

- Virtualenv activation fails (execution policy)
  - Open PowerShell as Administrator, then:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\venv\Scripts\Activate.ps1
  ```

- `ModuleNotFoundError: backend`
  - Run commands from the repo root, or set `PYTHONPATH` to the repo root when working inside `backend/`.

- ETL can’t find data files
  - Confirm parquet files are present under `backend/data/raw/` and paths in `backend/app/db/config.py` are correct.

- API reachable but frontend can’t load data
  - Ensure `this.apiBase` in `frontend/js/main.js` points to your backend and that CORS allows the frontend origin.

- Charts not rendering
  - Verify Chart.js CDN loads successfully and that the `Dashboard` section is active.

---

## Notes

- See `backend/README.md` for deeper backend/ETL details and environment variable configuration.
- See `frontend/README.md` for UI structure, customization, and deployment guidance.

