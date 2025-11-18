from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import os

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

@app.get("/api/v1/")
def read_root():
    return {"Test F1 Server"}

@app.get("/api/v1/telemetry")
def get_telemetry(driver: str, session_year: int, session_name: str, identifier: str):
    session = ff1.get_session(session_year, session_name, identifier)
    session.load()

    driver_laps = session.laps.pick_drivers(driver).pick_fastest()
    telemetry = driver_laps.get_car_data().add_distance()
    return {
        "distance": telemetry["Distance"].tolist(),
        "speed": telemetry["Speed"].tolist()
    }
    
@app.get("/api/v1/gear-data")
def get_gear_data(session_year: int, session_name: str, identifier: str):
    session = ff1.get_session(session_year, session_name, identifier)
    session.load()

    lap = session.laps.pick_fastest()
    telemetry = lap.get_telemetry()
    
    data = pd.DataFrame({
      "x": telemetry["X"],
      "y": telemetry["Y"],
      "gear": telemetry["nGear"].astype(int)
    })
    
    return data.to_dict(orient="records")

@app.get("/api/v1/track-dominance")
def get_track_dominance(session_year: int, session_name: str, identifier: str, driver01: str, driver02: str):
    session_event = ff1.get_session(session_year, session_name, identifier)
    session_event.load()

    fastest_lap_driver01 = session_event.laps.pick_drivers(driver01).pick_fastest()
    fastest_lap_driver02 = session_event.laps.pick_drivers(driver02).pick_fastest()

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