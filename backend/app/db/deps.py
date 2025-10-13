from __future__ import annotations

from typing import Generator

from .config import SessionLocal


def get_session() -> Generator:
    """
    Provide a SQLAlchemy session for FastAPI dependencies.

    Yields
    ------
    Session
        Database session bound to the configured engine.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()