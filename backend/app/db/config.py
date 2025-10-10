from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


DEFAULT_DB_HOST = "localhost"
DEFAULT_DB_PORT = "3306"
DEFAULT_DB_NAME = "urban_mobility"
DEFAULT_DB_USER = "user"
DEFAULT_DB_PASSWORD = "password"

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    db_user = os.getenv("DB_USER", DEFAULT_DB_USER)
    db_password = os.getenv("DB_PASSWORD", DEFAULT_DB_PASSWORD)
    db_host = os.getenv("DB_HOST", DEFAULT_DB_HOST)
    db_port = os.getenv("DB_PORT", DEFAULT_DB_PORT)
    db_name = os.getenv("DB_NAME", DEFAULT_DB_NAME)
    DATABASE_URL = (
        f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    )

engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True,
)

__all__ = ["DATABASE_URL", "engine", "SessionLocal"]
