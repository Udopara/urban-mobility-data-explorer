from __future__ import annotations

import argparse
from decimal import Decimal, InvalidOperation
from pathlib import Path
import pandas as pd
from sqlalchemy import delete
from sqlalchemy.exc import SQLAlchemyError

from backend.app.db.config import SessionLocal
from backend.app.models import Location, Trip, Vendor


DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "cleaned"
EXTRACTED_PATH = DATA_DIR / "extracted.csv"
ZONE_LOOKUP_PATH = DATA_DIR / "taxi_zone_lookup.csv"

VENDOR_NAME_MAP = {
    "HV0002": "Juno",
    "HV0003": "Uber",
    "HV0004": "Via",
    "HV0005": "Lyft",
    "1": "Creative Mobile Technologies (CMT)",
    "2": "Curb Mobility",
    "6": "Myle Technologies Inc",
    "7": "Helix",
}


def _safe_datetime(value):
    if pd.isna(value):
        return None
    if hasattr(value, "to_pydatetime"):
        return value.to_pydatetime()
    return pd.to_datetime(value, errors="coerce").to_pydatetime()


def _safe_decimal(value, max_abs: Decimal | None = None):
    if pd.isna(value):
        return None
    try:
        dec = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if not dec.is_finite():
        return None
    if max_abs is not None and abs(dec) > max_abs:
        return None
    return dec


def _safe_int(value):
    if pd.isna(value):
        return None
    return int(value)


def _normalize_vendor_id(value) -> str | None:
    if pd.isna(value):
        return None
    s = str(value).strip()
    if not s:
        return None
    if s.endswith(".0"):
        s = s[:-2]
    return s


def load_locations(session, lookup_df: pd.DataFrame) -> None:
    records = []

    for row in lookup_df.itertuples(index=False):
        records.append(
            Location(
                location_id=int(row.LocationID),
                borough=row.Borough if pd.notna(row.Borough) else None,
                zone=row.Zone if pd.notna(row.Zone) else None,
                service_zone=row.service_zone if pd.notna(row.service_zone) else None,
            )
        )

    session.bulk_save_objects(records, return_defaults=False)
    session.commit()
    print(f"Inserted {len(records):,} locations.")


def load_vendors(session, trip_df: pd.DataFrame) -> None:
    vendor_series = trip_df["vendor_id"].dropna().astype(str).str.strip()
    vendor_ids = sorted({vendor for vendor in vendor_series if vendor})
    records = [
        Vendor(
            vendor_id=vendor_id,
            vendor_name=VENDOR_NAME_MAP.get(vendor_id),
        )
        for vendor_id in vendor_ids
    ]
    session.bulk_save_objects(records, return_defaults=False)
    session.commit()
    print(f"Inserted {len(records):,} vendors.")


def load_trips(session, trip_df: pd.DataFrame, batch_size: int = 1_000) -> None:
    total = 0
    batch: list[Trip] = []

    for row in trip_df.itertuples(index=False):
        trip_miles = _safe_decimal(row.trip_miles, max_abs=Decimal("9999.99"))
        trip_duration_hours = _safe_decimal(row.trip_duration_hours, max_abs=Decimal("999.99"))
        average_speed = _safe_decimal(row.average_speed_mph, max_abs=Decimal("999.99"))
        base_fare = _safe_decimal(row.base_passenger_fare, max_abs=Decimal("999999.99"))
        driver_pay = _safe_decimal(row.driver_pay, max_abs=Decimal("999999.99"))
        extras = _safe_decimal(row.total_extra_charges, max_abs=Decimal("999999.99"))

        batch.append(
            Trip(
                vendor_id=row.vendor_id,
                pickup_id=int(row.PULocationID),
                dropoff_id=int(row.DOLocationID),
                request_datetime=_safe_datetime(row.request_datetime),
                on_scene_datetime=_safe_datetime(row.on_scene_datetime),
                pickup_datetime=_safe_datetime(row.pickup_datetime),
                dropoff_datetime=_safe_datetime(row.dropoff_datetime),
                trip_miles=trip_miles,
                trip_duration_hours=trip_duration_hours,
                trip_duration=_safe_int(row.trip_duration),
                average_speed_mph=average_speed,
                base_passenger_fare=base_fare,
                driver_pay=driver_pay,
                total_extra_charges=extras,
            )
        )

        if len(batch) >= batch_size:
            session.bulk_save_objects(batch, return_defaults=False)
            session.commit()
            total += len(batch)
            batch.clear()

    if batch:
        session.bulk_save_objects(batch, return_defaults=False)
        session.commit()
        total += len(batch)

    print(f"Inserted {total:,} trips.")


def reset_tables(session) -> None:
    session.execute(delete(Trip))
    session.execute(delete(Location))
    session.execute(delete(Vendor))
    session.commit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load cleaned CSV data into the database.")
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Append to existing tables instead of clearing them first.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1_000,
        help="Number of trip rows to insert per batch.",
    )
    return parser.parse_args()


def load_data(no_reset: bool = False, batch_size: int = 1_000) -> None:
    session = SessionLocal()

    try:
        if not no_reset:
            print("Clearing existing data...")
            reset_tables(session)

        if not ZONE_LOOKUP_PATH.exists():
            raise FileNotFoundError(f"Missing taxi zone lookup at {ZONE_LOOKUP_PATH}")
        if not EXTRACTED_PATH.exists():
            raise FileNotFoundError(f"Missing extracted CSV at {EXTRACTED_PATH}")

        lookup_df = (
            pd.read_csv(ZONE_LOOKUP_PATH)
            .rename(columns=lambda col: col.strip())
            .drop_duplicates(subset=["LocationID"])
        )
        trip_df = pd.read_csv(
            EXTRACTED_PATH,
            dtype={"vendor_id": "string"},
            parse_dates=["request_datetime", "on_scene_datetime", "pickup_datetime", "dropoff_datetime"],
            low_memory=False,
        ).replace("", pd.NA)

        # Ensure required fields are present and valid
        trip_df["vendor_id"] = trip_df["vendor_id"].apply(_normalize_vendor_id)
        trip_df = trip_df.dropna(subset=["vendor_id", "PULocationID", "DOLocationID"])
        trip_df = trip_df[trip_df["vendor_id"].astype(str).str.len() > 0]
        trip_df["PULocationID"] = trip_df["PULocationID"].astype("Int64")
        trip_df["DOLocationID"] = trip_df["DOLocationID"].astype("Int64")
        trip_df["trip_duration"] = trip_df["trip_duration"].round().astype("Int64")

        print("Loading locations...")
        load_locations(session, lookup_df)

        print("Loading vendors...")
        load_vendors(session, trip_df)

        print("Loading trips...")
        load_trips(session, trip_df, batch_size=batch_size)

        print("Database load complete.")
    except SQLAlchemyError as exc:
        session.rollback()
        raise
    finally:
        session.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load cleaned CSV data into the database.")
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Append to existing tables instead of clearing them first.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1_000,
        help="Number of trip rows to insert per batch.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_data(no_reset=args.no_reset, batch_size=args.batch_size)


if __name__ == "__main__":
    main()