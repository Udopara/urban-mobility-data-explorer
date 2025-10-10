"""Utility to create database tables defined in SQLAlchemy models."""

from __future__ import annotations

from backend.app.models import Base
from .config import engine


def create_tables(drop_existing: bool = True) -> None:
    """
    Create all tables defined on the SQLAlchemy Base metadata.

    Parameters
    ----------
    drop_existing:
        Drop existing tables before creation to ensure a clean schema.
    """
    if drop_existing:
        Base.metadata.drop_all(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine, checkfirst=True)


if __name__ == "__main__":
    create_tables()
