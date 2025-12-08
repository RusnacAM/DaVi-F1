from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import numpy as np
import os
import math
from scipy import interpolate

from utils.sectors import sector_dict
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
def get_telemetry(session_year: int, session_name: str, identifier: str, drivers: List[str] = Query(None)):
    session = get_loaded_session(session_year, session_name, identifier)

    result = {}
    for driver in drivers:
        fastest_lap = session.laps.pick_drivers(driver).pick_fastest()
        car_data = fastest_lap.get_car_data()
        telemetry = pd.DataFrame({
            "time": car_data["Time"],
            "speed": car_data["Speed"],
            "RPM": car_data["RPM"],
            "nGear": car_data["nGear"],
            "Throttle": car_data["Throttle"],
            "Brake": car_data["Brake"].astype(int),
            "DRS": car_data["DRS"]
        }).astype(object)
        
        result[driver] = telemetry.to_dict(orient="records")
    
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
def get_track_dominance(session_name: str, identifier: str,  drivers: List[str] = Query(None), session_years: List[int] = Query(None)):
    telemetry_list = []
    reference_driver = drivers[0]
    reference_year = session_years[0]
    
    session_ref = get_loaded_session(reference_year, session_name, identifier)
    reference_lap = session_ref.laps.pick_drivers(reference_driver).pick_fastest()
    reference_telemetry = reference_lap.get_telemetry().add_distance()
    reference_telemetry["Driver"] = reference_driver
    reference_telemetry["Year"] = reference_year
    
    for year in session_years:
        session_event = get_loaded_session(year, session_name, identifier)

        for driver in drivers:
            lap = session_event.laps.pick_drivers(driver).pick_fastest()
            telemetry = lap.get_telemetry().add_distance()

            telemetry["Driver"] = driver
            telemetry["Year"] = year
            telemetry["DriverYear"] = f"{driver}_{year}"

            telemetry_list.append(telemetry)

    telemetry_all = pd.concat(telemetry_list, ignore_index=True)

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
    
    reference_telemetry['Minisector'] = np.digitize(
        reference_telemetry['Distance'], bins=sector_bounds, right=False
    )
    result_telemetry = reference_telemetry.merge(
        fastest, on='Minisector', how='left'
    )

    result = pd.DataFrame({
        "x": result_telemetry["X"],
        "y": result_telemetry["Y"],
        "minisector": result_telemetry["Minisector"],
        "fastest": result_telemetry["Fastest"],
        "driver": result_telemetry["Driver"],
        "year": result_telemetry["Year"]
    })

    return result.to_dict(orient="records")

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
                "ref_driver": reference_driver_year[:3],
                "ref_year": int(reference_driver_year[-4:]),
                "driver": driver_year[:3],
                "year": int(driver_year[-4:])
                }).astype(object)
            
                result[driver] = lap_gap.to_dict(orient="records")

    all_diffs = np.concatenate(time_diff_list)
    time_diff_min = all_diffs.min()
    time_diff_max = all_diffs.max()

    return result