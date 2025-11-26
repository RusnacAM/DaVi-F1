from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import numpy as np
import os
import math

from sectors import sector_dict
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
def get_track_dominance(session_name: str, session_year: int, identifier: str,  drivers: List[str] = Query(None)):
    session = get_loaded_session(session_year, session_name, identifier)

    # Collect telemetry for all drivers
    telemetry_list = []

    for i, driver in enumerate(drivers):
        fastest_lap = session.laps.pick_drivers(driver).pick_fastest()
        telemetry = fastest_lap.get_telemetry().add_distance()
        telemetry['Driver'] = driver
        telemetry_list.append(telemetry)

    # Combine all driver telemetry into one DataFrame
    telemetry_drivers = pd.concat(telemetry_list)

    # Define minisectors
    if session_name in sector_dict.keys():
        sector_bounds = sector_dict[session_name]

    else:
        num_minisectors = 12
        sector_bounds = [0] * (num_minisectors + 1)
        total_dist = telemetry_drivers['Distance'].max()
        print(total_dist)
        for i in range(1,num_minisectors+1):
            sector_bounds[i] = math.ceil((i) * (total_dist/num_minisectors))

    
    # Create minisector mapping
    telemetry_drivers['Minisector'] = np.digitize(
        telemetry_drivers['Distance'],
        bins=sector_bounds,
        right=False
    )

    average_speed = telemetry_drivers.groupby(['Minisector', 'Driver'])['Speed'].mean().reset_index()
    fastest_driver = average_speed.loc[average_speed.groupby(['Minisector'])['Speed'].idxmax()]

    fastest_driver = fastest_driver[['Minisector', 'Driver']].rename(columns={'Driver': 'Fastest_driver'})
    telemetry_drivers = telemetry_drivers.merge(fastest_driver, on=['Minisector'])
    telemetry_drivers = telemetry_drivers.sort_values(by=['Distance'])
    
    data = pd.DataFrame({
      "x": telemetry_drivers["X"],
      "y": telemetry_drivers["Y"],
      "minisector": telemetry_drivers["Minisector"],
      "fastest_driver": telemetry_drivers["Fastest_driver"]
    })
    
    return data.to_dict(orient="records")

@app.get("/api/v1/braking-comparison")
def braking_comparison(session_year: int, session_name: str, identifier: str, driver: str):
    session = get_loaded_session(session_year, session_name, identifier)

    lap = session.laps.pick_drivers(driver).pick_fastest()

    if lap is None:
        return {"error": f"No laps for driver {driver}"}

    telemetry = lap.get_telemetry().add_distance()

    # Driver brake pedal (0 or 1)
    driver_brake = telemetry["Brake"].astype(int).values
    distance = telemetry["Distance"].values

    # Simple ideal brake estimation (drops when speed slows quickly)
    speed = telemetry["Speed"].values
    ideal_brake = np.gradient(speed) < -1.5  
    ideal_brake = ideal_brake.astype(int)

    df = pd.DataFrame({
        "distance": distance,
        "ideal_brake": ideal_brake,
        "driver_brake": driver_brake
    })

    return df.to_dict(orient="records")
