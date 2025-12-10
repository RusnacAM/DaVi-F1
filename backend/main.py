from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import numpy as np
import os
import math
from scipy import interpolate
from scipy.spatial import cKDTree

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
def get_track_dominance(
    session_name: str, 
    identifier: str,  
    drivers: list[str] = Query(None), 
    session_years: list[int] = Query(None)
):
    telemetry_list = []
    
    # Tracking the actual fastest lap object for reference X/Y data
    fastest_lap_object = None
    global_fastest_time = None
    
    if not drivers or not session_years:
        return []

    ### ---- Load telemetry data ---- ###
    for year in session_years:
        session_event = get_loaded_session(year, session_name, identifier)
        
        # Pre-load laps for all requested drivers in this session to avoid repeated filtering
        driver_laps = session_event.laps.pick_drivers(drivers)

        for driver in drivers:
            # Extract specific driver's fastest lap safely
            driver_lap = driver_laps.pick_drivers(driver).pick_fastest()
            
            # Check if valid lap exists
            if pd.isna(driver_lap['LapTime']):
                continue

            # Update Global Fastest Lap for Reference Telemetry
            current_time = driver_lap['LapTime']
            if global_fastest_time is None or current_time < global_fastest_time:
                global_fastest_time = current_time
                fastest_lap_object = driver_lap

            # Process Telemetry
            telemetry = driver_lap.get_telemetry().add_distance()
            telemetry["Driver"] = driver
            telemetry["Year"] = year
            telemetry["DriverYear"] = f"{driver}_{year}"
            
            # Keep only necessary columns to save memory
            cols_to_keep = ['Date', 'SessionTime', 'Driver', 'Year', 'DriverYear', 'Distance', 'Speed', 'X', 'Y']
            telemetry_list.append(telemetry[cols_to_keep])

    if not telemetry_list or fastest_lap_object is None:
        return []

    # Concatenate all telemetry data
    telemetry_all = pd.concat(telemetry_list, ignore_index=True)

    # Set Reference Telemetry (The actual spatial path of the fastest lap)
    reference_telemetry = driver_lap.get_telemetry().add_distance()
    # Note: We do not overwrite Driver/Year here to preserve the identity of the reference lap

    # ---- Mini Sector Logic ---- #
    if session_name in sector_dict:
        sector_bounds = sector_dict[session_name]
    else:
        num_minisectors = 12
        total_dist = telemetry_all['Distance'].max()
        # Create n+1 linspace bounds
        sector_bounds = np.linspace(0, total_dist, num_minisectors + 1)

    # Assign Minisectors
    telemetry_all['Minisector'] = np.digitize(
        telemetry_all['Distance'], bins=sector_bounds, right=False
    )
    reference_telemetry['Minisector'] = np.digitize(
        reference_telemetry['Distance'], bins=sector_bounds, right=False
    )

    # ---- Sector Labels ---- #
    if session_name in label_dict:
        labels = label_dict.get(session_name, {})
    else:
        # Calculate labels based on min speed in reference telemetry per sector
        sector_speeds = reference_telemetry.groupby('Minisector')['Speed'].min()
        labels = {}
        for minisector, speed in sector_speeds.items():
            if speed < 100:
                labels[minisector] = 'Slow'
            elif speed < 200:
                labels[minisector] = 'Medium'
            elif speed < 260:
                labels[minisector] = 'Fast'
            else:
                labels[minisector] = 'Straight'

    # ---- Dominance Calculation ---- #
    # Group by Sector and Driver, calculate Duration (Max SessionTime - Min SessionTime)
    sector_times = telemetry_all.groupby(['Minisector', 'DriverYear'])['SessionTime'].agg(lambda x: x.max() - x.min()).reset_index()
    sector_times.rename(columns={'SessionTime': 'TimeInSector'}, inplace=True)
    
    # Find Fastest Driver per Sector
    idx_fastest = sector_times.groupby('Minisector')['TimeInSector'].idxmin()
    fastest_per_sector = sector_times.loc[idx_fastest, ['Minisector', 'DriverYear', 'TimeInSector']]
    fastest_per_sector.rename(columns={'DriverYear': 'Fastest', 'TimeInSector': 'FastestTime'}, inplace=True)

    # Calculate Average Time of Everyone excluding the fastest
    # Merge fastest info back to sector times to exclude them from the mean calculation
    sector_analysis = sector_times.merge(fastest_per_sector[['Minisector', 'Fastest']], on='Minisector')
    
    # Filter out the fastest driver to calculate the mean of the rest
    others_times = sector_analysis[sector_analysis['DriverYear'] != sector_analysis['Fastest']]
    
    # Calculate Mean of others
    mean_others = others_times.groupby('Minisector')['TimeInSector'].mean().reset_index()
    mean_others.rename(columns={'TimeInSector': 'MeanTimeOthers'}, inplace=True)

    # Consolidate Stats
    stats_merged = fastest_per_sector.merge(mean_others, on='Minisector', how='left')
    stats_merged['TimeGainFastest'] = stats_merged['MeanTimeOthers'] - stats_merged['FastestTime']
    
    # Handle cases where there is only 1 driver (MeanTimeOthers would be NaN)
    stats_merged['TimeGainFastest'] = stats_merged['TimeGainFastest'].fillna(0)

    # ---- Final Result Construction ---- #
    
    # Merge stats onto spatial reference
    result_telemetry = reference_telemetry.merge(
        stats_merged[['Minisector', 'Fastest', 'TimeGainFastest']], 
        on='Minisector', 
        how='left'
    )

    # Map Labels
    result_telemetry['Label'] = result_telemetry['Minisector'].map(labels)

    # Parse Driver and Year from "Fastest" string
    result_telemetry["Driver"] = result_telemetry["Fastest"].str.split('_').str[0]
    result_telemetry["Year"] = result_telemetry["Fastest"].str.split('_').str[1].astype(int)

    # Final selection
    result = pd.DataFrame({
        "x": result_telemetry["X"],
        "y": result_telemetry["Y"],
        "minisector": result_telemetry["Minisector"],
        "fastest": result_telemetry["Fastest"],
        "driver": result_telemetry["Driver"],
        "year": result_telemetry["Year"],
        "TimeGainFastest": result_telemetry["TimeGainFastest"],
        "Label": result_telemetry["Label"]
    })

    return result.to_dict(orient='records')




### ---- Braking Comparison ---- ####

@app.get("/api/v1/braking-comparison")
def braking_comparison(
    session_year: str,
    session_name: str,
    identifier: str,
    drivers: str
):
    years = [int(y.strip()) for y in session_year.split(",")]
    driver_codes = [d.strip() for d in drivers.split(",")]
    
    all_results = []
    
    # Find the overall fastest lap across all years and drivers
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
    
    # Get ACTUAL brake telemetry from the fastest lap (not gradient!)
    ideal_telemetry = fastest_lap.get_telemetry().add_distance()
    ideal_brake = ideal_telemetry["Brake"].astype(int).values  
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
def get_average_loss_to_fastest(session_name: str, identifier: str, drivers: list[str] = Query(None), session_years: list[int] = Query(None)):
    telemetry_list = []
    
    # Track overall fastest lap
    fastest_lap_object = None
    global_fastest_time = None
    
    # Store fastest driver/year strings for final merging
    fastest_driver_overall = None
    fastest_year_overall = None

    if not drivers or not session_years:
        return []

    ### ---- Load telemetry data ---- ###
    for year in session_years:
        session_event = get_loaded_session(year, session_name, identifier)
        driver_laps = session_event.laps.pick_drivers(drivers)

        for driver in drivers:
            lap = driver_laps.pick_drivers(driver).pick_fastest()
            current_time = lap['LapTime']

            if global_fastest_time is None or current_time < global_fastest_time:
                global_fastest_time = current_time
                fastest_lap_object = lap
                fastest_driver_overall = driver
                fastest_year_overall = year

            telemetry = lap.get_telemetry().add_distance()
            telemetry["Driver"] = driver
            telemetry["Year"] = year
            telemetry["DriverYear"] = f"{driver}_{year}"

            # Only keep columns needed for calculation
            cols = ['SessionTime', 'Distance', 'Speed', 'DriverYear']
            telemetry_list.append(telemetry[cols])

    if not telemetry_list or fastest_lap_object is None:
        return []

    # Concatenate all telemetry data
    telemetry_all = pd.concat(telemetry_list, ignore_index=True)

    # Get correct reference telemetry (from the actual fastest lap)
    reference_telemetry = lap.get_telemetry().add_distance()

    ### ---- Get mini sectors ---- ###
    if session_name in sector_dict:
        sector_bounds = sector_dict[session_name]
    else:
        num_minisectors = 12
        total_dist = telemetry_all['Distance'].max()
        sector_bounds = np.linspace(0, total_dist, num_minisectors + 1)

    # Digitize both all telemetry and the reference telemetry
    telemetry_all['Minisector'] = np.digitize(
        telemetry_all['Distance'], bins=sector_bounds, right=False
    )
    
    reference_telemetry['Minisector'] = np.digitize(
        reference_telemetry['Distance'], bins=sector_bounds, right=False
    )

    ### ---- Add mini sector labels ---- ### 
    if session_name in label_dict:
        labels = label_dict.get(session_name, {})
    else:
        # Calculate labels based on the VALID reference telemetry
        sector_speeds = reference_telemetry.groupby('Minisector')['Speed'].min()

        labels = {}
        for minisector, speed in sector_speeds.items():
            if speed < 110:
                labels[minisector] = 'Slow'
            elif speed < 200:
                labels[minisector] = 'Medium'
            elif speed < 260:
                labels[minisector] = 'Fast'
            else:
                labels[minisector] = 'Straight'

    # Add labels to main dataframe
    telemetry_all['MinisectorLabel'] = telemetry_all['Minisector'].map(labels)

    ### ---- Calculate Time Spent per Sector ---- ###
    sector_analysis = (
        telemetry_all
        .groupby(['Minisector', 'MinisectorLabel', 'DriverYear'])['SessionTime']
        .agg(lambda x: x.max() - x.min())
        .dt.total_seconds()
        .reset_index()
        .rename(columns={'SessionTime': 'Time_sec'})
    )

    ### ---- Calculate Diff to Fastest ---- ###

    # Identify the unique string for the fastest driver
    fastest_str = f"{fastest_driver_overall}_{fastest_year_overall}"

    # Extract fastest driver times
    fastest_times = sector_analysis[sector_analysis['DriverYear'] == fastest_str][['Minisector', 'Time_sec']]
    
    # Merge fastest times back into the main dataframe
    sector_analysis = sector_analysis.merge(
        fastest_times,
        on='Minisector',
        suffixes=('', '_Fastest'),
        how='left'
    )

    # Calculate difference
    sector_analysis['Diff_to_Fastest_sec'] = sector_analysis['Time_sec'] - sector_analysis['Time_sec_Fastest']

    ### ---- Aggregate by Label ---- ###
    # Find the average time loss per minisector label for each driver
    result_df = (
        sector_analysis
        .groupby(['MinisectorLabel', 'DriverYear'])['Diff_to_Fastest_sec']
        .mean()
        .reset_index()
    )

    # Add metadata columns
    result_df['FastestOverallDriver'] = fastest_driver_overall
    result_df['FastestOverallYear'] = fastest_year_overall

    return result_df.to_dict(orient='records')


@app.get("/api/v1/lap-gap-evolution")
def get_lap_gap_evolution(
    session_name: str, 
    identifier: str,  
    drivers: List[str] = Query(None), 
    session_years: List[int] = Query(None)
):
    # Container to hold valid lap data
    lap_data_list = []
    
    # Tracking reference info
    global_fastest_time = None
    ref_index = -1 

    ### ---- Load Data ---- ###
    if not drivers or not session_years:
        return {"lapGaps": {}, "corners": []}

    for year in session_years:
        try:
            session_event = get_loaded_session(year, session_name, identifier)
            driver_laps = session_event.laps.pick_drivers(drivers)

            for driver in drivers:
                lap = driver_laps.pick_drivers(driver).pick_fastest()

                if pd.isna(lap['LapTime']):
                    continue
                
                lap_time = lap['LapTime']
                telemetry = lap.get_telemetry().add_distance()
                
                entry = {
                    "driver": driver,
                    "year": year,
                    "driver_year": f"{driver} {year}", 
                    "time": lap_time,
                    "x_coord": telemetry['X'].values,
                    "y_coord": telemetry['Y'].values,
                    "distance": telemetry['Distance'].values,
                    "time_series": telemetry['Time'].dt.total_seconds().values,
                    "session": session_event 
                }
                
                lap_data_list.append(entry)

                if global_fastest_time is None or lap_time < global_fastest_time:
                    global_fastest_time = lap_time
                    ref_index = len(lap_data_list) - 1
        except Exception as e:
            print(f"Error processing {year}: {e}")
            continue

    if not lap_data_list or ref_index == -1:
        return {"lapGaps": {}, "corners": []}

    ### ---- Prepare Reference Data ---- ###
    reference_entry = lap_data_list[ref_index]
    ref_time_series = reference_entry["time_series"]
    ref_distance = reference_entry["distance"]
    ref_id = reference_entry["driver_year"]
    
    # KDTree for spatial matching
    ref_coords = np.column_stack((reference_entry["x_coord"], reference_entry["y_coord"]))
    ref_tree = cKDTree(ref_coords)

    result = {}
    
    # Configuration
    TARGET_POINTS = 800  # Number of points to plot
    SMOOTHING_WINDOW = 15 # Filter strength (Higher = Smoother but less detail)
    
    ### ---- Calculate Gaps ---- ###
    for entry in lap_data_list:
        driver_year = entry["driver_year"]
        
        if driver_year == ref_id:
            continue
            
        d_x = entry["x_coord"]
        d_y = entry["y_coord"]
        d_dist = entry["distance"]
        d_time = entry["time_series"]
        
        # 1. Downsample INPUT data (optimization)
        if len(d_x) > TARGET_POINTS:
            step = len(d_x) // TARGET_POINTS
            d_x = d_x[::step]
            d_y = d_y[::step]
            d_dist = d_dist[::step]
            d_time = d_time[::step]

        driver_coords = np.column_stack((d_x, d_y))
        
        # 2. Spatial Query
        dists, indices = ref_tree.query(driver_coords, k=2)
        
        # 3. Disambiguate Matches (Fix crossovers/bridges)
        idx_0 = indices[:, 0]
        idx_1 = indices[:, 1]
        
        ref_d_0 = ref_distance[idx_0]
        ref_d_1 = ref_distance[idx_1]
        
        delta_0 = np.abs(ref_d_0 - d_dist)
        delta_1 = np.abs(ref_d_1 - d_dist)
        
        use_second = (delta_0 > 500) & (delta_1 < 500)
        chosen_indices = np.where(use_second, idx_1, idx_0)
        
        # 4. Calculate Raw Gap
        ref_time_at_match = ref_time_series[chosen_indices]
        gap_series_raw = d_time - ref_time_at_match
        
        # 5. Apply Smoothing (Moving Average)
        # This removes the jagged noise seen in your screenshot
        gap_series_smooth = pd.Series(gap_series_raw).rolling(
            window=SMOOTHING_WINDOW, 
            center=True, 
            min_periods=1
        ).mean().values
        
        x_axis_dist = ref_distance[chosen_indices]
        
        lap_gap = pd.DataFrame({
            "x": x_axis_dist,
            "y": gap_series_smooth,
            "driver": driver_year[:3], 
            "year": int(entry["year"])
        })

        lap_gap = lap_gap.sort_values(by="x").dropna()
        
        # Remove finish line artifact
        if not lap_gap.empty:
            lap_gap = lap_gap.iloc[:-1]
    
        result[driver_year] = lap_gap.to_dict(orient="records")

    ### ---- Get Circuit Info ---- ###
    ref_session = reference_entry["session"]
    circuit_info = ref_session.get_circuit_info()
    
    corners = []
    if circuit_info is not None:
        for _, corner in circuit_info.corners.iterrows():
            corners.append({
                "distance": float(corner["Distance"]),
                "label": f"{corner['Number']}{corner['Letter']}",
            })

    return {
        "lapGaps": result,
        "corners": corners          
    }