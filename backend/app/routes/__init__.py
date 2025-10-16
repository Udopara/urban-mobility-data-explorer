"""FastAPI routes for the Urban Mobility backend."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.db.deps import get_session
from backend.app.models import Location, Trip, Vendor
from backend.app.schemas import (
    InsightOverviewOut,
    LocationOut,
    TripOut,
    TripSummaryOut,
    VendorOut,
    VendorPerformanceOut,
)

api_router = APIRouter(prefix="/api")


@api_router.get("/vendors", response_model=List[VendorOut], tags=["Vendors"])
def list_vendors(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
) -> List[VendorOut]:
    vendors = (
        session.query(Vendor)
        .order_by(Vendor.vendor_id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return vendors


@api_router.get("/vendors/{vendor_id}", response_model=VendorOut, tags=["Vendors"])
def get_vendor(
    vendor_id: str,
    session: Session = Depends(get_session),
) -> VendorOut:
    vendor = session.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@api_router.get(
    "/vendors/{vendor_id}/trips", response_model=List[TripOut], tags=["Vendors"]
)
def get_vendor_trips(
    vendor_id: str,
    limit: int = Query(100, ge=1, le=1_000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
) -> List[TripOut]:
    vendor_exists = (
        session.query(Vendor.vendor_id)
        .filter(Vendor.vendor_id == vendor_id)
        .first()
    )
    if vendor_exists is None:
        raise HTTPException(status_code=404, detail="Vendor not found")

    trips = session.query(Trip).filter(Trip.vendor_id == vendor_id).order_by(
        Trip.pickup_datetime.desc()
    )
    trips = trips.offset(offset).limit(limit).all()
    return trips


@api_router.get("/locations", response_model=List[LocationOut], tags=["Locations"])
def list_locations(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
) -> List[LocationOut]:
    locations = (
        session.query(Location)
        .order_by(Location.location_id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return locations


@api_router.get("/locations/{location_id}", response_model=LocationOut, tags=["Locations"])
def get_location(
    location_id: int,
    session: Session = Depends(get_session),
) -> LocationOut:
    location = (
        session.query(Location)
        .filter(Location.location_id == location_id)
        .first()
    )
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@api_router.get(
    "/locations/{location_id}/trips", response_model=List[TripOut], tags=["Locations"]
)
def get_location_trips(
    location_id: int,
    role: str = Query("pickup", pattern="^(pickup|dropoff|both)$"),
    limit: int = Query(100, ge=1, le=1_000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
) -> List[TripOut]:
    location_exists = (
        session.query(Location.location_id)
        .filter(Location.location_id == location_id)
        .first()
    )
    if location_exists is None:
        raise HTTPException(status_code=404, detail="Location not found")

    query = session.query(Trip)
    if role == "pickup":
        query = query.filter(Trip.pickup_id == location_id)
    elif role == "dropoff":
        query = query.filter(Trip.dropoff_id == location_id)
    else:  # both
        query = query.filter(
            or_(Trip.pickup_id == location_id, Trip.dropoff_id == location_id)
        )

    trips = query.order_by(Trip.pickup_datetime.desc()).offset(offset).limit(limit).all()
    return trips


@api_router.get("/trips/summary", response_model=TripSummaryOut, tags=["Trips"])
def trip_summary(
    session: Session = Depends(get_session),
) -> TripSummaryOut:
    total_trips, avg_miles, avg_duration_hours, avg_speed, total_revenue, total_driver_pay = (
        session.query(
            func.count(Trip.trip_id),
            func.avg(Trip.trip_miles),
            func.avg(Trip.trip_duration_hours),
            func.avg(Trip.average_speed_mph),
            func.sum(Trip.base_passenger_fare),
            func.sum(Trip.driver_pay),
        )
        .one()
    )

    summary = TripSummaryOut(
        total_trips=total_trips or 0,
        avg_trip_miles=float(avg_miles) if avg_miles is not None else None,
        avg_trip_duration_minutes=float(avg_duration_hours * 60)
        if avg_duration_hours is not None
        else None,
        avg_speed_mph=float(avg_speed) if avg_speed is not None else None,
        total_revenue=float(total_revenue) if total_revenue is not None else None,
        total_driver_pay=float(total_driver_pay)
        if total_driver_pay is not None
        else None,
    )
    return summary


@api_router.get("/trips", response_model=List[TripOut], tags=["Trips"])
def list_trips(
    limit: int = Query(100, ge=1, le=1_000),
    offset: int = Query(0, ge=0),
    vendor_id: str | None = Query(None),
    search: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    sort_by: str | None = Query(None),
    sort_order: str = Query("desc"),
    session: Session = Depends(get_session),
) -> List[TripOut]:
    query = session.query(Trip)
    
    # Apply filters
    if vendor_id:
        query = query.filter(Trip.vendor_id == vendor_id)
    
    if search:
        # Search by trip_id or vendor_id
        search_filters = [Trip.vendor_id.like(f"%{search}%")]
        # Try to search by trip_id if search is numeric
        try:
            trip_id_val = int(search)
            search_filters.append(Trip.trip_id == trip_id_val)
        except ValueError:
            pass
        
        query = query.filter(or_(*search_filters))
    
    if start_date:
        query = query.filter(Trip.pickup_datetime >= start_date)
    
    if end_date:
        query = query.filter(Trip.pickup_datetime <= end_date)
    
    # Apply sorting
    if sort_by:
        sort_column = getattr(Trip, sort_by, None)
        if sort_column:
            if sort_order.lower() == "asc":
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(Trip.pickup_datetime.desc())
    else:
        query = query.order_by(Trip.pickup_datetime.desc())

    trips = query.offset(offset).limit(limit).all()
    return trips


@api_router.get("/trips/{trip_id}", response_model=TripOut, tags=["Trips"])
def get_trip(
    trip_id: int,
    session: Session = Depends(get_session),
) -> TripOut:
    trip = session.query(Trip).filter(Trip.trip_id == trip_id).first()
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@api_router.get("/insights/overview", response_model=InsightOverviewOut, tags=["Insights"])
def insights_overview(
    session: Session = Depends(get_session),
) -> InsightOverviewOut:
    total_trips, avg_base_fare, avg_extra = (
        session.query(
            func.count(Trip.trip_id),
            func.avg(Trip.base_passenger_fare),
            func.avg(Trip.total_extra_charges),
        )
        .one()
    )

    unique_vendors = session.query(func.count(func.distinct(Vendor.vendor_id))).scalar() or 0
    unique_locations = session.query(func.count(func.distinct(Location.location_id))).scalar() or 0

    return InsightOverviewOut(
        total_trips=total_trips or 0,
        unique_vendors=unique_vendors,
        unique_locations=unique_locations,
        avg_base_fare=float(avg_base_fare) if avg_base_fare is not None else None,
        avg_extra_charges=float(avg_extra) if avg_extra is not None else None,
    )


@api_router.get(
    "/insights/top-vendors", response_model=List[VendorPerformanceOut], tags=["Insights"]
)
def insights_top_vendors(
    limit: int = Query(5, ge=1, le=50),
    session: Session = Depends(get_session),
) -> List[VendorPerformanceOut]:
    results = (
        session.query(
            Trip.vendor_id,
            func.count(Trip.trip_id).label("trip_count"),
            func.avg(Trip.base_passenger_fare).label("avg_base_fare"),
            func.sum(Trip.base_passenger_fare).label("total_revenue"),
        )
        .group_by(Trip.vendor_id)
        .order_by(func.count(Trip.trip_id).desc())
        .limit(limit)
        .all()
    )

    payload = [
        VendorPerformanceOut(
            vendor_id=row.vendor_id,
            trip_count=row.trip_count or 0,
            avg_base_fare=float(row.avg_base_fare) if row.avg_base_fare is not None else None,
            total_revenue=float(row.total_revenue) if row.total_revenue is not None else None,
        )
        for row in results
    ]
    return payload


@api_router.get("/insights/algorithm-performance", tags=["Insights"])
def algorithm_performance_stats(session: Session = Depends(get_session)):
    """Returns custom algorithm performance statistics"""
    from sqlalchemy import func
    
    # Get total trips
    total_trips = session.query(func.count(Trip.trip_id)).scalar() or 0
    
    # Count outliers (if is_fare_outlier column exists)
    try:
        outlier_trips = session.query(func.count(Trip.trip_id)).filter(
            Trip.is_fare_outlier == True
        ).scalar() or 0
    except:
        # Column doesn't exist yet - algorithm hasn't been run
        outlier_trips = 0
    
    # Get fare statistics for algorithm validation
    fare_stats = session.query(
        func.min(Trip.base_passenger_fare).label('min_fare'),
        func.max(Trip.base_passenger_fare).label('max_fare'),
        func.avg(Trip.base_passenger_fare).label('avg_fare'),
        func.count(Trip.base_passenger_fare).label('fare_count')
    ).first()
    
    return {
        "algorithm_status": "Custom IQR Outlier Detection",
        "total_trips_analyzed": total_trips,
        "outliers_detected": outlier_trips,
        "outlier_percentage": round((outlier_trips / total_trips * 100), 2) if total_trips > 0 else 0,
        "fare_statistics": {
            "min_fare": float(fare_stats.min_fare) if fare_stats.min_fare else 0,
            "max_fare": float(fare_stats.max_fare) if fare_stats.max_fare else 0,
            "avg_fare": float(fare_stats.avg_fare) if fare_stats.avg_fare else 0,
            "total_with_fares": fare_stats.fare_count or 0
        },
        "algorithm_complexity": "O(n log n) - Manual QuickSort + IQR Detection",
        "data_quality_score": max(0, 100 - ((outlier_trips / total_trips * 100) if total_trips > 0 else 0))
    }


_all_ = ["api_router"]