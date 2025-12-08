from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import numpy as np
import os
import math
from scipy import interpolate

from utils.sectors import sector_dict, label_dict, labels_spanish, labels_bahrain, labels_austria, labels_italy, labels_britian, labels_abuDhabi
from typing import List
from functools import lru_cache

cache_dir = "Cache"
os.makedirs(cache_dir, exist_ok=True)
ff1.Cache.enable_cache('Cache')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@lru_cache(maxsize=128)
def get_loaded_session(year, name, identifier):
    s = ff1.get_session(year, name, identifier)
    s.load()
    return s

@app.get("/api/v1/")
def read_root():
    return {"Test F1 Server"}

@app.get("/api/v1/telemetry")
def get_telemetry(
    session_year: str,
    session_name: str,
    identifier: str,
    drivers: List[str] = Query(None)
):
    # Parse comma-separated years
    years = [int(y.strip()) for y in session_year.split(",")]
    
    result = {}
    
    for year in years:
        try:
            session = get_loaded_session(year, session_name, identifier)
            
            for driver in drivers:
                try:
                    fastest_lap = session.laps.pick_drivers(driver).pick_fastest()
                    if fastest_lap is None:
                        continue
                        
                    car_data = fastest_lap.get_telemetry().add_distance()
                    telemetry = pd.DataFrame({
                        "time": car_data["Time"],
                        "distance": car_data["Distance"],
                        "speed": car_data["Speed"],
                        "RPM": car_data["RPM"],
                        "nGear": car_data["nGear"],
                        "Throttle": car_data["Throttle"],
                        "Brake": car_data["Brake"].astype(int),
                        "DRS": car_data["DRS"]
                    }).astype(object)
                    
                    # Use year_driver as key
                    key = f"{year}_{driver}"
                    result[key] = telemetry.to_dict(orient="records")
                    
                except Exception as e:
                    print(f"Error processing driver {driver} in year {year}: {e}")
                    continue
                    
        except Exception as e:
            print(f"Error loading session for year {year}: {e}")
            continue
    
    return result
    
@app.get("/api/v1/gear-data")
def get_gear_data(session_year: int, session_name: str, identifier: str, driver: str):
    session = get_loaded_session(session_year, session_name, identifier)

    lap = session.laps.pick_drivers(driver).pick_fastest()
    telemetry = lap.get_telemetry()
    
    data = pd.DataFrame({
      "x": telemetry["X"],
      "y": telemetry["Y"],
      "gear": telemetry["nGear"].astype(int)
    })
    
    return data.to_dict(orient="records")


@app.get("/api/v1/track-dominance")
def get_track_dominance(session_name: str, identifier: str,  drivers: list[str] = Query(None), session_years: list[int] = Query(None)):
    telemetry_list = []
    
    # Track overall fastest lap across all loaded laps
    lap = None
    fastest_lap_time = None
    fastest_driver_overall = None
    fastest_year_overall = None

    ### ---- Load telemetry data ---- ###

    # Load all sessions and drivers' fastest laps
    for year in session_years:
        session_event = get_loaded_session(year, session_name, identifier)

        for driver in drivers:
            lap = session_event.laps.pick_drivers(driver).pick_fastest()

            # skip if no lap found
            if lap is None or getattr(lap, "empty", False):
                continue

            # Record overall fastest lap
            if 'LapTime' in lap.index:
                lap_time = lap['LapTime']
            else:
                # fallback attribute access if structure differs
                lap_time = getattr(lap, 'LapTime', None)

            if lap_time is not None and (fastest_lap_time is None or lap_time < fastest_lap_time):
                lap = session_event.laps.pick_drivers(driver).pick_fastest()
                fastest_lap_time = lap_time
                fastest_driver_overall = driver
                fastest_year_overall = year

            telemetry = lap.get_telemetry().add_distance()

            telemetry["Driver"] = driver
            telemetry["Year"] = year
            telemetry["DriverYear"] = f"{driver}_{year}"

            telemetry_list.append(telemetry)

    # Concatenate all telemetry data
    telemetry_all = pd.concat(telemetry_list, ignore_index=True)

    reference_telemetry = lap.get_telemetry().add_distance()
    reference_telemetry["Driver"] = fastest_driver_overall
    reference_telemetry["Year"] = fastest_year_overall

    if session_name in sector_dict.keys():
        sector_bounds = sector_dict[session_name]
    else:
        num_minisectors = 12
        sector_bounds = [0] * (num_minisectors + 1)
        total_dist = telemetry_all['Distance'].max()

        for i in range(1, num_minisectors + 1):
            sector_bounds[i] = math.ceil(i * (total_dist / num_minisectors))

    telemetry_all['Minisector'] = np.digitize(
        telemetry_all['Distance'], bins=sector_bounds, right=False
    )

    avg_speed = (
        telemetry_all
        .groupby(['Minisector', 'DriverYear'])['Speed']
        .mean()
        .reset_index()
    )

    fastest = avg_speed.loc[
        avg_speed.groupby('Minisector')['Speed'].idxmax()
    ][['Minisector', 'DriverYear']].rename(columns={'DriverYear': 'Fastest'})

    #---- Merge fastest driver into average speed ---- #
    avg_speed = avg_speed.merge(
        fastest, on='Minisector', how='left'
    )

    # Get the fastest speed per minisector
    avg_speed['FastestSpeed'] = avg_speed.groupby('Minisector')['Speed'].transform('max')

    # Get time spend in sector
    avg_speed['SectorLength'] = 0
    for i in range(1, len(sector_bounds)):
        length = sector_bounds[i] - sector_bounds[i-1]
        avg_speed.loc[avg_speed['Minisector'] == i, 'SectorLength'] = length

    # Add sector labels
    if session_name in label_dict.keys():
        labels = label_dict.get(session_name, {})
    #Assign labels according to minimum speed of minisector
    else:
        sector_speeds = (
            telemetry_all
            .groupby('Minisector')['Speed']
            .min()
            .reset_index()
        )

        labels = {}
        for _, row in sector_speeds.iterrows():
            minisector = row['Minisector']
            speed = row['Speed']
            if speed < 100:
                labels[minisector] = 'Slow'
            elif speed < 160:
                labels[minisector] = 'Medium'
            elif speed < 220:
                labels[minisector] = 'Fast'
            else:
                labels[minisector] = 'Straight'
        
    avg_speed['MinisectorLabel'] = avg_speed['Minisector'].map(labels)

    avg_speed['TimeInSector'] = (avg_speed['SectorLength'] / avg_speed['Speed'])  # time in seconds
    avg_speed['FastestTimeInSector'] = (avg_speed['SectorLength'] / avg_speed['FastestSpeed'])  # time in seconds
    
    # Find average time gain for fastest driver in each minisector
    sector_means = avg_speed.groupby('Minisector').apply(
    lambda x: x.loc[x['DriverYear'] != x['Fastest'], 'TimeInSector'].mean()
)
    avg_speed['MeanTimeInSector'] = avg_speed['Minisector'].map(sector_means)
    avg_speed['TimeGainFastest'] = avg_speed['MeanTimeInSector'] - avg_speed['FastestTimeInSector']
    
    reference_telemetry['Minisector'] = np.digitize(
        reference_telemetry['Distance'], bins=sector_bounds, right=False
    )
    result_telemetry = reference_telemetry.merge(
        fastest, on='Minisector', how='left'
    )

    result_telemetry["Driver"] = result_telemetry["Fastest"].apply(lambda x: x.split('_')[0])
    result_telemetry["Year"] = result_telemetry["Fastest"].apply(lambda x: int(x.split('_')[1]))
    
    #Merge avg_speed in results telemetry
    result_telemetry = result_telemetry.merge(
        avg_speed[['Minisector', 'DriverYear', 'TimeGainFastest','MinisectorLabel']],
        left_on=['Minisector', result_telemetry["Fastest"]],
        right_on=['Minisector', 'DriverYear'],
        how='left')

    result = pd.DataFrame({
        "x": result_telemetry["X"],
        "y": result_telemetry["Y"],
        "minisector": result_telemetry["Minisector"],
        "fastest": result_telemetry["Fastest"],
        "driver": result_telemetry["Driver"],
        "year": result_telemetry["Year"],
        "TimeGainFastest": round(result_telemetry["TimeGainFastest"],4),
        "Label": result_telemetry["MinisectorLabel"]
    })

    return result.to_dict(orient="records")


### ---- Braking Comparison ---- ####

@app.get("/api/v1/braking-comparison")
def braking_comparison(
    session_year: str,  # Can be comma-separated: "2024,2025"
    session_name: str,
    identifier: str,
    drivers: str  # Can be comma-separated: "VER,LEC"
):
    # Parse comma-separated values
    years = [int(y.strip()) for y in session_year.split(",")]
    driver_codes = [d.strip() for d in drivers.split(",")]
    
    all_results = []
    
    # Find the overall fastest lap across all years and drivers (the "ideal")
    fastest_lap = None
    fastest_time = float('inf')
    
    for year in years:
        try:
            session = get_loaded_session(year, session_name, identifier)
            for driver_code in driver_codes:
                lap = session.laps.pick_drivers(driver_code).pick_fastest()
                if lap is not None and lap['LapTime'].total_seconds() < fastest_time:
                    fastest_time = lap['LapTime'].total_seconds()
                    fastest_lap = lap
        except Exception as e:
            print(f"Error loading session {year}/{driver_code}: {e}")
            continue
    
    if fastest_lap is None:
        return {"error": "No valid laps found"}
    
    # Get ideal brake from the fastest lap
    ideal_telemetry = fastest_lap.get_telemetry().add_distance()
    ideal_speed = ideal_telemetry["Speed"].values
    ideal_brake = (np.gradient(ideal_speed) < -1.5).astype(int)
    ideal_distance = ideal_telemetry["Distance"].values
    
    # Now get each driver's brake data
    for year in years:
        try:
            session = get_loaded_session(year, session_name, identifier)
            for driver_code in driver_codes:
                lap = session.laps.pick_drivers(driver_code).pick_fastest()
                
                if lap is None:
                    continue
                
                telemetry = lap.get_telemetry().add_distance()
                driver_brake = telemetry["Brake"].astype(int).values
                distance = telemetry["Distance"].values
                
                # Interpolate to match ideal lap distance
                from scipy.interpolate import interp1d
                f_brake = interp1d(distance, driver_brake, bounds_error=False, fill_value=0)
                driver_brake_aligned = f_brake(ideal_distance)
                
                # Create result for this driver-year combo
                df = pd.DataFrame({
                    "distance": ideal_distance,
                    "ideal_brake": ideal_brake,
                    "driver_brake": driver_brake_aligned,
                    "driver": driver_code,
                    "year": year
                })
                
                all_results.append(df.to_dict(orient="records"))
                
        except Exception as e:
            print(f"Error processing {year}/{driver_code}: {e}")
            continue
    
    # Return as a dictionary with driver_year keys
    result = {}
    idx = 0
    for year in years:
        for driver_code in driver_codes:
            if idx < len(all_results):
                key = f"{year}_{driver_code}"
                result[key] = all_results[idx]
                idx += 1
    
    return result

@app.get("/api/v1/braking-distribution")
def get_braking_distribution(
    session_year: str, 
    session_name: str,
    identifier: str,
    drivers: List[str] = Query(None)
):
    # Parse comma-separated years
    years = [int(y.strip()) for y in session_year.split(",")]
    
    output = []

    for year in years:
        try:
            session = get_loaded_session(year, session_name, identifier)
            
            # Use only real laps
            laps = session.laps.pick_accurate().pick_not_deleted().pick_wo_box()

            for driver in drivers:
                driver_laps = laps.pick_drivers(driver)

                for _, lap in driver_laps.iterrows():
                    try:
                        car = lap.get_car_data().add_distance().copy()
                        car["Brake"] = car["Brake"].astype(float)
                        car["dDist"] = car["Distance"].diff().fillna(0)
                        braking_distance = car.loc[car["Brake"] > 0.5, "dDist"].sum()

                        output.append({
                            "driver": driver,
                            "year": year,
                            "lap": int(lap["LapNumber"]),
                            "braking_distance": float(braking_distance)
                        })
                    except Exception:
                        continue
        except Exception as e:
            print(f"Error processing year {year}: {e}")
            continue

    return {"data": output}
    return result.to_dict(orient="records")

@app.get("/api/v1/AvgDiffs")
def get_average_loss_to_fastest(session_name: str, identifier: str,  drivers: list[str] = Query(None), session_years: list[int] = Query(None)):
    telemetry_list = []
    
    # Track overall fastest lap across all loaded laps
    fastest_lap_time = None
    fastest_driver_overall = None
    fastest_year_overall = None

    ### ---- Load telemetry data ---- ###

    # Load all sessions and drivers' fastest laps
    for year in session_years:
        session_event = get_loaded_session(year, session_name, identifier)

        for driver in drivers:
            lap = session_event.laps.pick_drivers(driver).pick_fastest()

            # skip if no lap found
            if lap is None or getattr(lap, "empty", False):
                continue

            # Record overall fastest lap
            if 'LapTime' in lap.index:
                lap_time = lap['LapTime']
            else:
                # fallback attribute access if structure differs
                lap_time = getattr(lap, 'LapTime', None)

            if lap_time is not None and (fastest_lap_time is None or lap_time < fastest_lap_time):
                fastest_lap_time = lap_time
                fastest_driver_overall = driver
                fastest_year_overall = year

            telemetry = lap.get_telemetry().add_distance()

            telemetry["Driver"] = driver
            telemetry["Year"] = year
            telemetry["DriverYear"] = f"{driver}_{year}"

            telemetry_list.append(telemetry)

    # Concatenate all telemetry data
    telemetry_all = pd.concat(telemetry_list, ignore_index=True)

    ### ---- Get mini sectors, labels added later ---- ###

    # Create minisectors based on predefined sector bounds or equal divisions
    if session_name in sector_dict.keys():
        sector_bounds = sector_dict[session_name]
    else:
        num_minisectors = 12
        sector_bounds = [0] * (num_minisectors + 1)
        total_dist = telemetry_all['Distance'].max()

        for i in range(1, num_minisectors + 1):
            sector_bounds[i] = math.ceil(i * (total_dist / num_minisectors))

    telemetry_all['Minisector'] = np.digitize(
        telemetry_all['Distance'], bins=sector_bounds, right=False
    )


    # Get sector lengths
    sector_lengths = []
    for i in range(1, len(sector_bounds)):
        sector_lengths.append(sector_bounds[i] - sector_bounds[i-1])
    sector_length_df = pd.DataFrame({
        'Minisector': list(range(1, len(sector_bounds))),
        'SectorLength': sector_lengths
    })

    ### ---- Calculate average time and time loss to fastest driver per minisector ---- ### 

    # Get average speed per driver per minisector
    avg_speed = (
        telemetry_all
        .groupby(['Minisector', 'DriverYear'])['Speed']
        .mean()
        .reset_index()
    )

    # Add sector labels
    if session_name in label_dict.keys():
        labels = label_dict.get(session_name, {})
    #Assign labels according to minimum speed of minisector
    else:
        sector_speeds = (
            telemetry_all
            .groupby('Minisector')['Speed']
            .min()
            .reset_index()
        )

        labels = {}
        for _, row in sector_speeds.iterrows():
            minisector = row['Minisector']
            speed = row['Speed']
            if speed < 100:
                labels[minisector] = 'Slow'
            elif speed < 160:
                labels[minisector] = 'Medium'
            elif speed < 220:
                labels[minisector] = 'Fast'
            else:
                labels[minisector] = 'Straight'
        
    avg_speed['MinisectorLabel'] = avg_speed['Minisector'].map(labels)

    # Transform speed to time per sector (in seconds)
    avg_speed = avg_speed.merge(sector_length_df, on='Minisector')
    avg_speed['Speed'] = avg_speed['Speed']/3.6 # convert to m/s
    avg_speed['Time_sec'] = avg_speed['SectorLength'] / avg_speed['Speed']


    # Find speed difference per minisector to overall fastest driver
    avg_speed = avg_speed.merge(
        avg_speed[avg_speed['DriverYear'] == f"{fastest_driver_overall}_{fastest_year_overall}"][['Minisector', 'Time_sec']],
        on='Minisector',
        suffixes=('', '_Fastest')
    )

    avg_speed['Diff_to_Fastest_sec'] =  avg_speed['Time_sec'] - avg_speed['Time_sec_Fastest']

    #Find the average time loss per minisector label for each driver
    avg_speed = (
        avg_speed
        .groupby(['DriverYear','MinisectorLabel'])['Diff_to_Fastest_sec']
        .mean()
        .reset_index()
    )

    avg_speed['FastestOverallDriver'] = fastest_driver_overall
    avg_speed['FastestOverallYear'] = fastest_year_overall

    return avg_speed.to_dict(orient='records')


@app.get("/api/v1/lap-gap-evolution")
def get_lap_gap_evolution(session_name: str, identifier: str,  drivers: List[str] = Query(None), session_years: List[int] = Query(None)):
    fastest_laps = {}
    telemetry_data = {}

    for year in session_years:
        session = get_loaded_session(year, session_name, identifier)
        for driver in drivers:
            lap = session.laps.pick_drivers(driver).pick_fastest()

            if lap is None or len(lap) == 0:
                continue
            
            fastest_laps[(driver, year)] = lap['LapTime']

            telemetry = lap.get_telemetry().add_distance()
            telemetry['Driver'] = driver
            telemetry['Year'] = year
            telemetry['DriverYear'] = f"{driver} {year}"

            telemetry_data[f"{driver} {year}"] = telemetry.reset_index(drop=True) 

    reference_driver_year = min(fastest_laps, key=fastest_laps.get)
    reference_driver_year = f"{reference_driver_year[0]} {reference_driver_year[1]}"
    ref_tel = telemetry_data[reference_driver_year]
    common_distance = ref_tel['Distance'].values

        
    # Store interpolated speed data
    interpolated_speeds = {}
        
    # Interpolate all drivers to common distance points
    for driver_year in telemetry_data.keys():
        tel = telemetry_data[driver_year]
                
        if len(tel['Distance']) > 10:
            f_speed = interpolate.interp1d(
                tel['Distance'], tel['Speed'],
                kind='linear', bounds_error=False, 
                fill_value='extrapolate'
            )
            interpolated_speeds[driver_year] = f_speed(common_distance)
    
    time_diff_list = []

    # Calculate cumulative time differences
    result = {}
    if reference_driver_year in interpolated_speeds:
        ref_speed = interpolated_speeds[reference_driver_year]
                
        for driver_year in interpolated_speeds.keys():
            if driver_year != reference_driver_year:
                driver_speed = interpolated_speeds[driver_year]
                        
                # Calculate distance segments
                distance_segments = np.diff(common_distance)
                distance_segments = np.append(distance_segments, distance_segments[-1])
                    
                # Prevent division by zero
                ref_speed_safe = np.maximum(ref_speed, 1.0)
                driver_speed_safe = np.maximum(driver_speed, 1.0)
                        
                # Time calculation: t = d / v (convert km/h to m/s)
                ref_time_segments = distance_segments / (ref_speed_safe / 3.6)
                driver_time_segments = distance_segments / (driver_speed_safe / 3.6)
                    
                # Cumulative time difference
                time_diff = np.cumsum(driver_time_segments - ref_time_segments)
                time_diff_list.append(time_diff)

                lap_gap = pd.DataFrame({
                "x": common_distance.tolist(),
                "y": time_diff.tolist(),
                # "ref_driver": reference_driver_year[:3],
                # "ref_year": int(reference_driver_year[-4:]),
                "driver": driver_year[:3],
                "year": int(driver_year[-4:])
                }).astype(object)

                # print(lap_gap)
            
                result[driver] = lap_gap.to_dict(orient="records")

    all_diffs = np.concatenate(time_diff_list)
    time_diff_min = all_diffs.min()
    time_diff_max = all_diffs.max()

    return result