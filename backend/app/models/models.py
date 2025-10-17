from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Boolean
from sqlalchemy.orm import declarative_base, relationship


Base = declarative_base()


class Vendor(Base):
    __tablename__ = "vendors"

    vendor_id = Column(String(10), primary_key=True)
    vendor_name = Column(String(50), nullable=True)

    trips = relationship("Trip", back_populates="vendor")

    def __repr__(self) -> str: 
        return f"<Vendor vendor_id={self.vendor_id!r}>"


class Location(Base):
    __tablename__ = "locations"

    location_id = Column(Integer, primary_key=True, autoincrement=False)
    borough = Column(String(50), nullable=True)
    zone = Column(String(100), nullable=True)
    service_zone = Column(String(50), nullable=True)

    pickup_trips = relationship("Trip", back_populates="pickup_location", foreign_keys="Trip.pickup_id")
    dropoff_trips = relationship("Trip", back_populates="dropoff_location", foreign_keys="Trip.dropoff_id")

    def __repr__(self) -> str: 
        return f"<Location location_id={self.location_id}>"


class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(Integer, primary_key=True, autoincrement=True)
    vendor_id = Column(String(10), ForeignKey("vendors.vendor_id"), nullable=False, index=True)
    pickup_id = Column(Integer, ForeignKey("locations.location_id"), nullable=False, index=True)
    dropoff_id = Column(Integer, ForeignKey("locations.location_id"), nullable=False, index=True)

    request_datetime = Column(DateTime, nullable=True)
    on_scene_datetime = Column(DateTime, nullable=True)
    pickup_datetime = Column(DateTime, nullable=True)
    dropoff_datetime = Column(DateTime, nullable=True)

    trip_miles = Column(Numeric(6, 2), nullable=True)
    trip_duration_hours = Column(Numeric(5, 2), nullable=True)
    trip_duration = Column(Integer, nullable=True)
    average_speed_mph = Column(Numeric(5, 2), nullable=True)
    base_passenger_fare = Column(Numeric(8, 2), nullable=True)
    driver_pay = Column(Numeric(8, 2), nullable=True)
    total_extra_charges = Column(Numeric(8, 2), nullable=True)
    is_fare_outlier = Column(Boolean, nullable=True, default=False)

    vendor = relationship("Vendor", back_populates="trips")
    pickup_location = relationship(
        "Location",
        back_populates="pickup_trips",
        foreign_keys=[pickup_id],
    )
    dropoff_location = relationship(
        "Location",
        back_populates="dropoff_trips",
        foreign_keys=[dropoff_id],
    )

    def __repr__(self) -> str: 
        return f"<Trip trip_id={self.trip_id}>"
