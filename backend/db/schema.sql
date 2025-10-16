-- Urban Mobility Database Schema
-- Normalized schema for NYC Taxi Trip data

DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS vendors;

-- Vendors table
CREATE TABLE vendors (
    vendor_id VARCHAR(10) PRIMARY KEY,
    vendor_name VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Locations (NYC Taxi Zones)
CREATE TABLE locations (
    location_id INT PRIMARY KEY,
    borough VARCHAR(50) DEFAULT NULL,
    zone VARCHAR(100) DEFAULT NULL,
    service_zone VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trips (main fact table)
CREATE TABLE trips (
    trip_id INT PRIMARY KEY AUTO_INCREMENT,
    
    vendor_id VARCHAR(10) NOT NULL,
    pickup_id INT NOT NULL,
    dropoff_id INT NOT NULL,
    
    request_datetime DATETIME DEFAULT NULL,
    on_scene_datetime DATETIME DEFAULT NULL,
    pickup_datetime DATETIME DEFAULT NULL,
    dropoff_datetime DATETIME DEFAULT NULL,
    
    -- Derived features
    trip_miles DECIMAL(6, 2) DEFAULT NULL,
    trip_duration_hours DECIMAL(5, 2) DEFAULT NULL,
    trip_duration INT DEFAULT NULL,
    average_speed_mph DECIMAL(5, 2) DEFAULT NULL,
    
    base_passenger_fare DECIMAL(8, 2) DEFAULT NULL,
    driver_pay DECIMAL(8, 2) DEFAULT NULL,
    total_extra_charges DECIMAL(8, 2) DEFAULT NULL,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (pickup_id) REFERENCES locations(location_id),
    FOREIGN KEY (dropoff_id) REFERENCES locations(location_id),
    
    INDEX idx_vendor (vendor_id),
    INDEX idx_pickup (pickup_id),
    INDEX idx_dropoff (dropoff_id),
    INDEX idx_pickup_datetime (pickup_datetime)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
