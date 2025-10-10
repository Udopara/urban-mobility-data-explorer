import pandas as pd

def transform_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean, filter, and enrich taxi trip data safely.
    """
    print("Cleaning and transforming data...")

    # Make a copy to avoid SettingWithCopyWarning
    df = df.copy()

   # drop duplicates
    df = df.drop_duplicates()

    
    # merge PULocationID with PUlocationID
    df["PULocationID"] = (
        df["PULocationID"]
        .combine_first(df["PUlocationID"])
    )

    # merge DOLocationID with DOlocationID
    df["DOLocationID"] = (
        df["DOLocationID"]
        .combine_first(df["DOlocationID"])
    )

    # drop PUlocationID and DOlocationID
    df = df.drop(columns=['PUlocationID', 'DOlocationID'])

    # replace missing values in PULocationID and DOLocationID columns with NaN
    df[['PULocationID', 'DOLocationID']] = (
        df[['PULocationID', 'DOLocationID']]
        .apply(pd.to_numeric, errors='coerce')  # convert to numbers, invalid → NaN
    )

    # drop unnecessary columns
    df.drop(columns=[
        'Affiliated_base_number', 
        'trip_type', 
        'SR_Flag', 
        'store_and_fwd_flag', 
        'total_amount',
        'shared_request_flag',
        'shared_match_flag',
        'access_a_ride_flag',
        'wav_request_flag',
        'wav_match_flag',
        'ehail_fee',
        'trip_time',
        'RatecodeID',
        'passenger_count',
        'payment_type',
        'Affiliated_base_number',
        ], inplace=True)

    # merge dropOff_datetime with dropoff_datetime
    df['dropoff_datetime'] = df['dropoff_datetime'].combine_first(df['dropOff_datetime'])

    # merge trip_distance with trip_miles
    df['trip_miles'] = df['trip_miles'].combine_first(df['trip_distance'])

    # drop trip_distance
    df = df.drop(columns=['trip_distance'])
    
    # drop dropOff_datetime
    df.drop(columns="dropOff_datetime", inplace=True)

    # combine hvfhs_license_num, dispatching_base_num, and VendorID into vendor_id
    df["vendor_id"] = (
        df["hvfhs_license_num"]
        .combine_first(df["dispatching_base_num"])
        .combine_first(df["VendorID"])
    )

    # drop the hvfhs_license_num, dispatching_base_num, VendorID, and originating_base_num columns
    df.drop(
        columns=[
            "hvfhs_license_num",
            "dispatching_base_num",
            "VendorID",
            "originating_base_num",
        ],
        inplace=True,
    )

    # move vendor_id to the first column
    df = df[["vendor_id"] + [col for col in df.columns if col != "vendor_id"]]

    # combine the pickup_datetime, lpep_pickup_datetime, and tpep_pickup_datetime columns into pickup_datetime
    df["pickup_datetime"] = (
        df["pickup_datetime"]
        .combine_first(df["lpep_pickup_datetime"])
        .combine_first(df["tpep_pickup_datetime"])
    )

    # drop the lpep_pickup_datetime and tpep_pickup_datetime columns
    df.drop(columns=["lpep_pickup_datetime", "tpep_pickup_datetime"], inplace=True)

    # combine dropoff_datetime, lpep_dropoff_datetime, and tpep_dropoff_datetime into dropoff_datetime
    df["dropoff_datetime"] = (
        df["dropoff_datetime"]
        .combine_first(df["lpep_dropoff_datetime"])
        .combine_first(df["tpep_dropoff_datetime"])
    )

    # drop the lpep_dropoff_datetime and tpep_dropoff_datetime columns
    df.drop(columns=["lpep_dropoff_datetime", "tpep_dropoff_datetime"], inplace=True)

    # merge fare_amount into base_passenger_fare
    df["base_passenger_fare"] = df["fare_amount"].combine_first(df["base_passenger_fare"])

    # drop the fare_amount column
    df.drop(columns=["fare_amount"], inplace=True)

    # replace missing values in base_passenger_fare column with 0
    df[['base_passenger_fare']] = (
        df[['base_passenger_fare']]
        .apply(pd.to_numeric, errors='coerce')  # convert invalid entries to NaN
        .fillna(0)
        .astype(float) 
    )

    # calculate total extra charges
    df['total_extra_charges'] = (
        df[[
            'tolls',
             'bcf', 
             'sales_tax', 
             'congestion_surcharge', 
             'airport_fee', 
             'Airport_fee',
             'tips', 
             'extra', 
             'mta_tax', 
             'tip_amount', 
             'tolls_amount', 
             'improvement_surcharge',
             'cbd_congestion_fee',
             ]]
        .fillna(0)
        .sum(axis=1)
        .round(2)
    )

    # drop the extra, mta_tax, tip_amount, tolls_amount, and improvement_surcharge columns
    df.drop(
        columns=[
            'tolls',
             'bcf', 
             'sales_tax', 
             'congestion_surcharge', 
             'airport_fee', 
             'Airport_fee',
             'tips', 
             'extra', 
             'mta_tax', 
             'tip_amount', 
             'tolls_amount', 
             'improvement_surcharge',
             'cbd_congestion_fee',
        ],
        inplace=True,
    )

    datetime_cols = ['request_datetime', 'on_scene_datetime', 'dropoff_datetime', 'pickup_datetime']

    for col in datetime_cols:
        df[col] = pd.to_datetime(df[col], errors='coerce')


    df['trip_duration_hours'] = (
        (df['dropoff_datetime'] - df['pickup_datetime'])
        .dt.total_seconds() / 3600
    ).round(2)

    df['average_speed_mph'] = df.apply(
        lambda row: row['trip_miles'] / row['trip_duration_hours']
        if pd.notna(row['trip_miles']) and pd.notna(row['trip_duration_hours']) and row['trip_duration_hours'] > 0
        else pd.NA,
        axis=1
    )

    df['average_speed_mph'] = pd.to_numeric(df['average_speed_mph'], errors='coerce').round(2)

    df['trip_duration'] = (df['dropoff_datetime'] - df['pickup_datetime']).dt.total_seconds()

    df['trip_duration'] = df['trip_duration'].apply(lambda x: round(x, 2) if pd.notna(x) and x >= 0 else pd.NA)


    df = df.dropna(subset=['PULocationID', 'DOLocationID', 'trip_miles', 'average_speed_mph'])

    df['driver_pay'] = df['driver_pay'].replace('', pd.NA)

    df[['request_datetime', 'on_scene_datetime']] = df[['request_datetime', 'on_scene_datetime']].replace('', pd.NA)
    df['request_datetime'] = pd.to_datetime(df['request_datetime'], errors='coerce')
    df['on_scene_datetime'] = pd.to_datetime(df['on_scene_datetime'], errors='coerce')


    # List of columns to exclude
    exclude_cols = ['driver_pay', 'request_datetime', 'on_scene_datetime']

    # Replace empty strings with NaN
    df = df.replace('', pd.NA)

    # Filter out rows where all of these columns are missing
    cols_to_check = [col for col in df.columns if col not in exclude_cols]

    # Filter out rows where all of these columns are missing
    df = df.dropna(subset=cols_to_check, how='all')


    # Filter out rows where base_passenger_fare or total_extra_charges are negative
    df = df[(df['base_passenger_fare'] >= 0) & (df['total_extra_charges'] >= 0)]




    return df