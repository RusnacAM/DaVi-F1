from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import numpy as np
import os
import math

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

    telemetry_all = telemetry_all.merge(fastest, on='Minisector')

    telemetry_all = telemetry_all.sort_values(by=['Distance'])

    result = pd.DataFrame({
        "x": telemetry_all["X"],
        "y": telemetry_all["Y"],
        "minisector": telemetry_all["Minisector"],
        "fastest": telemetry_all["Fastest"],
        "driver": telemetry_all["Driver"],
        "year": telemetry_all["Year"]
    })

    return result.to_dict(orient="records")