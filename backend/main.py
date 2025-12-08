from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd
import numpy as np
import os
import math

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

    #Get the speed of the fastest overall driver as a new column, now NAs
    avg_speed = avg_speed.merge(
        avg_speed[avg_speed['DriverYear'] == f"{fastest_driver_overall}_{fastest_year_overall}"][['Minisector', 'Speed']].rename(columns={'Speed': 'FastestSpeed'}),
        on='Minisector', how='left'
    )

    # Get time spend in sector
    avg_speed['SectorLength'] = 0
    for i in range(1, len(sector_bounds)):
        length = sector_bounds[i] - sector_bounds[i-1]
        avg_speed.loc[avg_speed['Minisector'] == i, 'SectorLength'] = length

    avg_speed['TimeInSector'] = (avg_speed['SectorLength'] / avg_speed['Speed'])  # time in seconds
    avg_speed['FastestTimeInSector'] = (avg_speed['SectorLength'] / avg_speed['FastestSpeed'])  # time in seconds
    avg_speed['TimeLossToFastest'] = avg_speed['TimeInSector'] - avg_speed['FastestTimeInSector']

    print(avg_speed)
    
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
        avg_speed[['Minisector', 'DriverYear', 'TimeLossToFastest']],
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
        "lossToFastest": round(result_telemetry["TimeLossToFastest"],2)
    })

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

    #print(avg_speed)

    # Add sector labels
    labels = label_dict.get(session_name, {})
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