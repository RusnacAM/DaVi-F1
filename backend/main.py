from typing import Union
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

# @app.get("/api/v1/track-dominance")
# def get_track_dominance(session_year: int, session_name: str, identifier: str, *drivers: str):
#     session_event = ff1.get_session(session_year, session_name, identifier)
#     session_event.load()

#     # fastest_lap_driver01 = session_event.laps.pick_drivers(driver01).pick_fastest()
#     # fastest_lap_driver02 = session_event.laps.pick_drivers(driver02).pick_fastest()
#     # fastest_lap_driver03 = session_event.laps.pick_drivers(driver03).pick_fastest()

#     # telemetry_driver01 = fastest_lap_driver01.get_telemetry().add_distance()
#     # telemetry_driver02 = fastest_lap_driver02.get_telemetry().add_distance()
#     # telemetry_driver03 = fastest_lap_driver03.get_telemetry().add_distance()

#     # telemetry_driver01['Driver'] = driver01
#     # telemetry_driver02['Driver'] = driver02
#     # telemetry_driver03['Driver'] = driver03

#     # telemetry_drivers_total = pd.concat([telemetry_driver01, telemetry_driver02, telemetry_driver03])

#     telemetry_list = []

#     for driver in drivers:
#         fastest_lap = session_event.laps.pick_drivers(driver).pick_fastest()
#         telemetry = fastest_lap.get_telemetry().add_distance()
#         telemetry['Driver'] = driver
#         telemetry_list.append(telemetry)

#     # telemetry_drivers_total = pd.concat([telemetry_drivers[0], telemetry_drivers[1]])
#     telemetry_drivers_total = pd.concat(telemetry_list, ignore_index=True)

#     num_minisectors = 7*3
#     total_distance = total_distance = max(telemetry_drivers_total['Distance'])
#     minisector_length = total_distance / num_minisectors

#     minisectors = [0]
#     for i in range(0, (num_minisectors - 1)):
#         minisectors.append(minisector_length * (i + 1))

#     telemetry_drivers_total['Minisector'] = telemetry_drivers_total['Distance'].apply(
#         lambda dist: (
#             int((dist // minisector_length) + 1)
#         )
#     )

#     average_speed = telemetry_drivers_total.groupby(['Minisector', 'Driver'])['Speed'].mean().reset_index()
#     average_time = telemetry_drivers_total.groupby(['Minisector', 'Driver'])['Time'].mean().reset_index()
#     fastest_driver = average_speed.loc[average_speed.groupby(['Minisector'])['Speed'].idxmax()]

#     fastest_driver = fastest_driver[['Minisector', 'Driver']].rename(columns={'Driver': 'Fastest_driver'})
#     telemetry_drivers_total = telemetry_drivers_total.merge(fastest_driver, on=['Minisector'])
#     telemetry_drivers_total = telemetry_drivers_total.sort_values(by=['Distance'])
    
#     minisector_time_diff = average_time.pivot(index='Minisector', columns='Driver', values='Time').reset_index()
#     minisector_time_diff['Time_diff'] = minisector_time_diff[drivers[0]] - minisector_time_diff[drivers[1]]
#     telemetry_drivers_total = telemetry_drivers_total.merge(minisector_time_diff[['Minisector', 'Time_diff']], on='Minisector', how='left')
    
#     data = pd.DataFrame({
#       "x": telemetry_drivers_total["X"],
#       "y": telemetry_drivers_total["Y"],
#       "minisector": telemetry_drivers_total["Minisector"],
#       "fastest_driver": telemetry_drivers_total["Fastest_driver"],
#       "time_diff": telemetry_drivers_total["Time_diff"]
#     })
    
#     return data.to_dict(orient="records")

@app.get("/api/v1/track-dominance")
def get_track_dominance(drivers, session_name: str, session_year: int, identifier: str):
    session_event = ff1.get_session(session_year, session_name, identifier)
    session_event.load()

    # Collect telemetry for all drivers
    telemetry_list = []

    for i, driver in enumerate(drivers):
        fastest_lap = session_event.laps.pick_drivers(driver).pick_fastest()
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
    average_time = telemetry_drivers.groupby(['Minisector', 'Driver'])['Time'].mean().reset_index()
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