#!/bin/bash
echo "Starting FastAPI backend server..."
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
