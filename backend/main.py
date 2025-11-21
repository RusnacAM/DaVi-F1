from typing import Union
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import os
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
def get_track_dominance(session_year: int, session_name: str, identifier: str, driver01: str, driver02: str):
    session = get_loaded_session(session_year, session_name, identifier)

    fastest_lap_driver01 = session.laps.pick_drivers(driver01).pick_fastest()
    fastest_lap_driver02 = session.laps.pick_drivers(driver02).pick_fastest()

    telemetry_driver01 = fastest_lap_driver01.get_telemetry().add_distance()
    telemetry_driver02 = fastest_lap_driver02.get_telemetry().add_distance()

    telemetry_driver01['Driver'] = driver01
    telemetry_driver02['Driver'] = driver02
    telemetry_drivers = pd.concat([telemetry_driver01, telemetry_driver02])

    num_minisectors = 7*3
    total_distance = total_distance = max(telemetry_drivers['Distance'])
    minisector_length = total_distance / num_minisectors

    minisectors = [0]
    for i in range(0, (num_minisectors - 1)):
        minisectors.append(minisector_length * (i + 1))

    telemetry_drivers['Minisector'] = telemetry_drivers['Distance'].apply(
        lambda dist: (
            int((dist // minisector_length) + 1)
        )
    )

    average_speed = telemetry_drivers.groupby(['Minisector', 'Driver'])['Speed'].mean().reset_index()
    average_time = telemetry_drivers.groupby(['Minisector', 'Driver'])['Time'].mean().reset_index()
    fastest_driver = average_speed.loc[average_speed.groupby(['Minisector'])['Speed'].idxmax()]

    fastest_driver = fastest_driver[['Minisector', 'Driver']].rename(columns={'Driver': 'Fastest_driver'})
    telemetry_drivers = telemetry_drivers.merge(fastest_driver, on=['Minisector'])
    telemetry_drivers = telemetry_drivers.sort_values(by=['Distance'])
    
    minisector_time_diff = average_time.pivot(index='Minisector', columns='Driver', values='Time').reset_index()
    minisector_time_diff['Time_diff'] = minisector_time_diff[driver01] - minisector_time_diff[driver02]
    telemetry_drivers = telemetry_drivers.merge(minisector_time_diff[['Minisector', 'Time_diff']], on='Minisector', how='left')
    
    data = pd.DataFrame({
      "x": telemetry_drivers["X"],
      "y": telemetry_drivers["Y"],
      "minisector": telemetry_drivers["Minisector"],
      "fastest_driver": telemetry_drivers["Fastest_driver"],
      "time_diff": telemetry_drivers["Time_diff"]
    })
    
    return data.to_dict(orient="records")