import fastf1 as ff1
import numpy as np
import pandas as pd
import math

#from backend.utils import sectors
from backend.main import get_loaded_session
from fastapi import FastAPI, Query



""""
### Track Dominance function ###
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
    
    # Print data types
    print("Data types:")
    print(data.dtypes)
    print("\nFirst few records:")
    print(data.head())
    
    return data.to_dict(orient="records")
"""

def get_track_dominance(session_name: str, identifier: str, drivers: list[str] = Query(None),
                                  session_years: list[int] = Query(None)):   
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

    # Combine into one dataframe
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
        "fastest_driver": telemetry_all["Driver"]
        #"driver": telemetry_all["Fastest"],
        #"year": telemetry_all["Year"]
    })

    return result.to_dict(orient="records")

drivers = ["VER","LEC","HAM"]
D = get_track_dominance(drivers, session_name = "Bahrain Grand Prix", session_year = [2021,2022], identifier = "Q")
print(D)
