from typing import List, Dict
import pandas as pd
from app.utils.custom_algorithms import OutlierDetector, find_top_k_trips_by_duration


def apply_fare_outlier_detection(df: pd.DataFrame) -> pd.DataFrame:
    """Uses manual IQR algorithm to detect suspicious fares"""
    print("\n" + "="*60)
    print("Applying Custom Fare Outlier Detection")
    print("="*60)
    
    fares = df['base_passenger_fare'].dropna().tolist()
    detector = OutlierDetector(multiplier=1.5)
    outlier_indices, stats = detector.detect_outliers(fares)
    
    print(f"\nFare Outlier Detection Results:")
    print(f"  Total fares analyzed: {stats['total_records']:,}")
    print(f"  Outliers detected: {stats['outliers_count']:,} ({stats['outlier_percentage']:.2f}%)")
    print(f"  Q1 (25th percentile): ${stats['q1']:.2f}")
    print(f"  Q3 (75th percentile): ${stats['q3']:.2f}")
    print(f"  IQR: ${stats['iqr']:.2f}")
    print(f"  Lower bound: ${stats['lower_bound']:.2f}")
    print(f"  Upper bound: ${stats['upper_bound']:.2f}")
    print(f"  Median fare: ${stats['median']:.2f}")
    
    df['is_fare_outlier'] = False
    valid_indices = df['base_passenger_fare'].dropna().index.tolist()
    
    for outlier_idx in outlier_indices:
        df.loc[valid_indices[outlier_idx], 'is_fare_outlier'] = True
    
    outlier_df = df[df['is_fare_outlier'] == True][['vendor_id', 'base_passenger_fare', 'trip_miles']]
    print(f"\nSample suspicious fares (first 10):")
    print(outlier_df.head(10).to_string())
    
    return df


def find_extreme_trips(df: pd.DataFrame, k: int = 20) -> Dict[str, List[Dict]]:
    """Uses custom Min-Heap to find longest/shortest trips without sort_values()"""
    print("\n" + "="*60)
    print(f"Finding Top-{k} Extreme Trips Using Custom Heap")
    print("="*60)
    
    trips = df[['trip_id', 'vendor_id', 'trip_duration_hours', 'trip_miles']].to_dict('records')
    longest_trips = find_top_k_trips_by_duration(trips, k=k)
    
    print(f"\nTop {min(k, len(longest_trips))} Longest Trips:")
    for i, trip in enumerate(longest_trips[:10], 1):
        duration = trip.get('trip_duration_hours', 0) or 0
        miles = trip.get('trip_miles', 0) or 0
        print(f"  {i}. Trip {trip.get('trip_id')}: {duration:.2f} hours, {miles:.2f} miles")
    
    # Negate durations to find shortest using same heap
    trips_negated = [
        {**t, 'trip_duration_hours': -(t.get('trip_duration_hours', 0) or 0)}
        for t in trips
        if t.get('trip_duration_hours') is not None and t['trip_duration_hours'] > 0
    ]
    
    shortest_trips = find_top_k_trips_by_duration(trips_negated, k=k)
    for trip in shortest_trips:
        trip['trip_duration_hours'] = -trip['trip_duration_hours']
    
    print(f"\nTop {min(k, len(shortest_trips))} Shortest Trips:")
    for i, trip in enumerate(shortest_trips[:10], 1):
        duration = trip.get('trip_duration_hours', 0) or 0
        miles = trip.get('trip_miles', 0) or 0
        print(f"  {i}. Trip {trip.get('trip_id')}: {duration:.2f} hours, {miles:.2f} miles")
    
    return {
        'longest': longest_trips,
        'shortest': shortest_trips
    }


if __name__ == "__main__":
    print("Custom Algorithm Integration Examples")
    print("="*60)
    print("\nManual implementations (no built-in sorting):")
    print("  ✓ QuickSort for data sorting")
    print("  ✓ Min-Heap for top-K selection")
    print("  ✓ IQR-based outlier detection")
    print("  ✓ Time/Space complexity included")

