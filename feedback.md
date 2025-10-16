### Dataset context

This project uses July 2025 New York City Taxi & Limousine Commission (TLC) trip records and reference data:

- For-hire vehicle (FHV) trips: `fhv_tripdata_2025-07.parquet`
- High-volume FHV trips (rideshare): `fhvhv_tripdata_2025-07.parquet`
- Green taxi trips: `green_tripdata_2025-07.parquet`
- Yellow taxi trips: `yellow_tripdata_2025-07.parquet`
- Location lookup: `taxi_zone_lookup.csv`

These are standard TLC datasets covering trip metadata (pickup/dropoff timestamps and taxi zones), distances, fares, and vendor identifiers where available. The location lookup maps numeric TLC location IDs to boroughs and zones and is used to contextualize spatial patterns.

---

### Data challenges

- Missing or null fields
  - Absent `dropoff_datetime`, `trip_distance`, or fare fields; missing `vendor_id` on some services.
- Schema drift across services
  - Column names and availability differ between FHV/FHVHV vs green/yellow (e.g., base fare vs total fare, distance units, extras/surcharges).
- Outliers and anomalies
  - Negative or zero distances, durations, or fares; excessively long trips (multi-day) or extremely short (< 1 min) with non-zero fares.
- Temporal inconsistencies
  - Timestamp timezone ambiguity, daylight savings edges, and unsorted pickup/dropoff ordering.
- Duplicates and near-duplicates
  - Repeated trip IDs or records with identical timestamps/locations due to provider re-exports.
- Derived metric instability
  - Average speed spikes from near-zero distances or tiny durations; rounding errors from parquet conversions.
- Location reference gaps
  - Trips referencing location IDs not present in `taxi_zone_lookup.csv` (legacy or decommissioned zones) or null pickup/dropoff IDs.

---

### Cleaning assumptions

- Time handling
  - Treat timestamps as NYC local time; ensure `pickup_datetime <= dropoff_datetime`. Remove records with reversed or missing ordering.
- Duration and distance validity
  - Compute duration in minutes from timestamps; drop trips with duration ≤ 0 or > 24 hours.
  - Accept non-negative distances; drop negative; flag zero-distance trips for diagnostic metrics but exclude from speed calculations.
- Fare normalization
  - Prefer total fare when present; otherwise use base fare fields. Drop rows with negative monetary values; keep zero fares as valid (promos/comped rides).
- Outlier controls
  - Cap inferred average speed at a reasonable bound (e.g., 80 mph) for display; keep raw values for auditing.
- Schema harmonization
  - Standardize shared fields across services (trip id, vendor id, pickup/dropoff datetimes, distance miles, duration hours/minutes, base/total fare). Fill missing categorical fields with `Unknown` rather than impute.
- Location enrichment
  - Left-join on `taxi_zone_lookup.csv`; if no match, set borough/zone to `Unknown` and retain numeric `location_id`.
- Date scope
  - Filter to July 2025 records inclusive; discard records outside the period due to late/early exports.

These choices prioritize consistent analytics and UI stability while preserving enough raw signal to investigate quality issues.

---

### Unexpected observation that influenced design

Early profiling showed a sizable tail of trips with extremely short durations and near-zero distances, which produced unrealistic average speeds when naively computed. This led to two design decisions:

- The frontend prominently displays both duration and average speed, with formatting that guards against divide-by-near-zero artifacts and caps shown speeds.
- The API/UI favors “top vendors” and hourly trip counts over raw speed distributions to avoid misleading visuals from these edge cases, while still surfacing speed context per trip.


