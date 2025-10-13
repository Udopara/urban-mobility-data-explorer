from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI

from backend.app.routes import api_router


app = FastAPI(
    title="Urban Mobility Data Explorer API",
    version="1.0.0",
description="API endpoints for exploring vendors, locations, trips, and analytical insights.",
)

app.include_router(api_router)


@app.get("/health", tags=["Utility"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    env_path = PROJECT_ROOT / "backend" / ".env"

    uvicorn_params: dict[str, str | int | bool] = {
        "host": "127.0.0.1",
        "port": 8000,
        "reload": True,
    }
    if env_path.exists():
        uvicorn_params["env_file"] = str(env_path)

    uvicorn.run("backend.app.main:app", **uvicorn_params)