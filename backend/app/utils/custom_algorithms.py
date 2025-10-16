from typing import List, Tuple, Dict, Any


class OutlierDetector:
    """
    IQR-based outlier detection for identifying suspicious fares.
    No built-in sort functions used - implements QuickSort manually.
    
    Pseudo-code:
    1. Sort dataset using QuickSort
    2. Calculate Q1 (25th percentile) and Q3 (75th percentile)
    3. IQR = Q3 - Q1
    4. Bounds: [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
    5. Flag values outside bounds
    
    Time: O(n log n), Space: O(n)
    """
    
    def __init__(self, multiplier: float = 1.5):
        self.multiplier = multiplier
        self.q1 = None
        self.q3 = None
        self.iqr = None
        self.lower_bound = None
        self.upper_bound = None
    
    def manual_sort(self, data: List[float]) -> List[float]:
        """QuickSort implementation - Time: O(n log n) avg, O(n²) worst"""
        if len(data) <= 1:
            return data
        
        pivot_idx = len(data) // 2
        pivot = data[pivot_idx]
        
        left = []
        middle = []
        right = []
        
        for value in data:
            if value < pivot:
                left.append(value)
            elif value > pivot:
                right.append(value)
            else:
                middle.append(value)
        
        return self.manual_sort(left) + middle + self.manual_sort(right)
    
    def calculate_percentile(self, sorted_data: List[float], percentile: float) -> float:
        """Calculate percentile with linear interpolation"""
        if not sorted_data:
            return 0.0
        
        n = len(sorted_data)
        index = (percentile / 100.0) * (n - 1)
        lower_idx = int(index)
        upper_idx = min(lower_idx + 1, n - 1)
        
        if lower_idx == upper_idx:
            return sorted_data[lower_idx]
        
        fraction = index - lower_idx
        lower_val = sorted_data[lower_idx]
        upper_val = sorted_data[upper_idx]
        
        return lower_val + fraction * (upper_val - lower_val)
    
    def detect_outliers(self, data: List[float]) -> Tuple[List[int], Dict[str, Any]]:
        """Returns (outlier_indices, statistics_dict)"""
        if not data:
            return [], {}
        
        sorted_data = self.manual_sort(data)
        
        self.q1 = self.calculate_percentile(sorted_data, 25)
        self.q3 = self.calculate_percentile(sorted_data, 75)
        self.iqr = self.q3 - self.q1
        self.lower_bound = self.q1 - (self.multiplier * self.iqr)
        self.upper_bound = self.q3 + (self.multiplier * self.iqr)
        
        outlier_indices = []
        for i, value in enumerate(data):
            if value < self.lower_bound or value > self.upper_bound:
                outlier_indices.append(i)
        
        stats = {
            'total_records': len(data),
            'outliers_count': len(outlier_indices),
            'outlier_percentage': (len(outlier_indices) / len(data)) * 100 if data else 0,
            'q1': self.q1,
            'q3': self.q3,
            'iqr': self.iqr,
            'lower_bound': self.lower_bound,
            'upper_bound': self.upper_bound,
            'min_value': sorted_data[0],
            'max_value': sorted_data[-1],
            'median': self.calculate_percentile(sorted_data, 50)
        }
        
        return outlier_indices, stats


class CustomMinHeap:
    """
    Min-Heap for finding top-K trips efficiently.
    Insert: O(log n), Extract: O(log n), Peek: O(1), Space: O(n)
    """
    
    def __init__(self):
        self.heap = []
    
    def parent(self, i: int) -> int:
        return (i - 1) // 2
    
    def left_child(self, i: int) -> int:
        return 2 * i + 1
    
    def right_child(self, i: int) -> int:
        return 2 * i + 2
    
    def swap(self, i: int, j: int):
        self.heap[i], self.heap[j] = self.heap[j], self.heap[i]
    
    def bubble_up(self, i: int):
        """Move element up to maintain heap property"""
        while i > 0:
            parent_idx = self.parent(i)
            if self.heap[i][0] < self.heap[parent_idx][0]:
                self.swap(i, parent_idx)
                i = parent_idx
            else:
                break
    
    def bubble_down(self, i: int):
        """Move element down to maintain heap property"""
        n = len(self.heap)
        while True:
            smallest = i
            left = self.left_child(i)
            right = self.right_child(i)
            
            if left < n and self.heap[left][0] < self.heap[smallest][0]:
                smallest = left
            
            if right < n and self.heap[right][0] < self.heap[smallest][0]:
                smallest = right
            
            if smallest != i:
                self.swap(i, smallest)
                i = smallest
            else:
                break
    
    def insert(self, priority: float, data: Any):
        self.heap.append((priority, data))
        self.bubble_up(len(self.heap) - 1)
    
    def extract_min(self) -> Tuple[float, Any]:
        if not self.heap:
            raise IndexError("Heap is empty")
        
        if len(self.heap) == 1:
            return self.heap.pop()
        
        min_item = self.heap[0]
        self.heap[0] = self.heap.pop()
        self.bubble_down(0)
        
        return min_item
    
    def peek(self) -> Tuple[float, Any]:
        if not self.heap:
            raise IndexError("Heap is empty")
        return self.heap[0]
    
    def size(self) -> int:
        return len(self.heap)
    
    def is_empty(self) -> bool:
        return len(self.heap) == 0


def find_top_k_trips_by_duration(trips: List[Dict], k: int = 10) -> List[Dict]:
    """
    Find top K longest trips using Min-Heap.
    Time: O(n log k), Space: O(k)
    """
    heap = CustomMinHeap()
    
    for trip in trips:
        duration = trip.get('trip_duration_hours', 0) or 0
        
        if heap.size() < k:
            heap.insert(duration, trip)
        elif duration > heap.peek()[0]:
            heap.extract_min()
            heap.insert(duration, trip)
    
    result = []
    while not heap.is_empty():
        _, trip = heap.extract_min()
        result.append(trip)
    
    return result[::-1]


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Custom Algorithms")
    print("=" * 60)
    
    # Test outlier detection
    sample_fares = [10.5, 12.0, 15.5, 11.0, 9.5, 500.0, 13.0, 14.5, 12.5, 1000.0]
    detector = OutlierDetector()
    outlier_indices, stats = detector.detect_outliers(sample_fares)
    
    print(f"\nSample Data: {sample_fares}")
    print(f"\nStatistics:")
    for key, value in stats.items():
        print(f"  {key}: {value:.2f}" if isinstance(value, float) else f"  {key}: {value}")
    
    print(f"\nOutlier Indices: {outlier_indices}")
    print(f"Outlier Values: {[sample_fares[i] for i in outlier_indices]}")
    
    # Test min-heap
    print("\n" + "=" * 60)
    trips_data = [
        {'trip_id': 1, 'trip_duration_hours': 0.5},
        {'trip_id': 2, 'trip_duration_hours': 2.5},
        {'trip_id': 3, 'trip_duration_hours': 1.0},
        {'trip_id': 4, 'trip_duration_hours': 3.5},
        {'trip_id': 5, 'trip_duration_hours': 0.25},
    ]
    
    top_3 = find_top_k_trips_by_duration(trips_data, k=3)
    print(f"\nTop 3 trips by duration:")
    for trip in top_3:
        print(f"  Trip {trip['trip_id']}: {trip['trip_duration_hours']} hours")

