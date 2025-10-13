from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vendor_id: str
    vendor_name: Optional[str] = None


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    location_id: int
    borough: Optional[str] = None
    zone: Optional[str] = None
    service_zone: Optional[str] = None


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trip_id: int
    vendor_id: str
    pickup_id: int
    dropoff_id: int
    request_datetime: Optional[datetime] = None
    on_scene_datetime: Optional[datetime] = None
    pickup_datetime: Optional[datetime] = None
    dropoff_datetime: Optional[datetime] = None
    trip_miles: Optional[float] = None
    trip_duration_hours: Optional[float] = None
    trip_duration: Optional[int] = None
    average_speed_mph: Optional[float] = None
    base_passenger_fare: Optional[float] = None
    driver_pay: Optional[float] = None
    total_extra_charges: Optional[float] = None


class TripSummaryOut(BaseModel):
    total_trips: int
    avg_trip_miles: Optional[float] = None
    avg_trip_duration_minutes: Optional[float] = None
    avg_speed_mph: Optional[float] = None
    total_revenue: Optional[float] = None
    total_driver_pay: Optional[float] = None


class InsightOverviewOut(BaseModel):
    total_trips: int
    unique_vendors: int
    unique_locations: int
    avg_base_fare: Optional[float] = None
    avg_extra_charges: Optional[float] = None


class VendorPerformanceOut(BaseModel):
    vendor_id: str
    trip_count: int
    avg_base_fare: Optional[float] = None
    total_revenue: Optional[float] = None