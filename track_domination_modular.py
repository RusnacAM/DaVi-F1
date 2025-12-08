import fastf1 as ff1
import numpy as np
import pandas as pd
import math

#from backend.utils import sectors
#from backend.main import get_loaded_session
from fastapi import FastAPI, Query

sector_dict = {
    'British Grand Prix': [0,350,800,1150,1830,2300,2930,3170,3600,4200,4900,5130,5400,5650],
    'Italian Grand Prix': [0,800,1050,2050,2300,2700,2950,3850,4200,5000,5500],
    'Austrian Grand Prix': [0,330,500,1300,1450,2100,2250,2600,3100,3600,4020],
    'Spanish Grand Prix': [0,750,1250,1600,1870,2000,2200,2450,2600,2800,3000,3370,3900,4400],
    'Bahrain Grand Prix': [0,600,850,1400,1650,2100,2300,2600,2750,3350,3900,4200,4790,5000],
    'Abu Dhabi Grand Prix': [0,275,700,1300,1520,2550,2750,3550,3850,4250,4375,4700,5100]
}

def get_loaded_session(year, name, identifier):
    s = ff1.get_session(year, name, identifier)
    s.load()
    return s

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
    """
    avg_speed = avg_speed.merge(
        avg_speed[avg_speed['DriverYear'] == f"{fastest_driver_overall}_{fastest_year_overall}"][['Minisector', 'Speed']].rename(columns={'Speed': 'FastestSpeed'}),
        on='Minisector', how='left'
    )
    """

    # Get the fastest speed per minisector
    avg_speed['FastestSpeed'] = avg_speed.groupby('Minisector')['Speed'].transform('max')

    # Get time spend in sector
    avg_speed['SectorLength'] = 0
    for i in range(1, len(sector_bounds)):
        length = sector_bounds[i] - sector_bounds[i-1]
        avg_speed.loc[avg_speed['Minisector'] == i, 'SectorLength'] = length

    avg_speed['TimeInSector'] = (avg_speed['SectorLength'] / avg_speed['Speed'])  # time in seconds
    avg_speed['FastestTimeInSector'] = (avg_speed['SectorLength'] / avg_speed['FastestSpeed'])  # time in seconds
    
    # Find average time gain for fastest driver in each minisector
    sector_means = avg_speed.groupby('Minisector').apply(
    lambda x: x.loc[x['DriverYear'] != x['Fastest'], 'TimeInSector'].mean()
)
    avg_speed['MeanTimeInSector'] = avg_speed['Minisector'].map(sector_means)
    avg_speed['TimeGainFastest'] = avg_speed['MeanTimeInSector'] - avg_speed['FastestTimeInSector']

    print(avg_speed.head(20))
    
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
        avg_speed[['Minisector', 'DriverYear', 'TimeGainFastest']],
        left_on=['Minisector', result_telemetry["Fastest"]],
        right_on=['Minisector', 'DriverYear'],
        how='left')
    
    #print(result_telemetry.tail(10))

    result = pd.DataFrame({
        "x": result_telemetry["X"],
        "y": result_telemetry["Y"],
        "minisector": result_telemetry["Minisector"],
        "fastest": result_telemetry["Fastest"],
        "driver": result_telemetry["Driver"],
        "year": result_telemetry["Year"],
        "TimeGainFastest": result_telemetry["TimeGainFastest"]
    })

    return result.to_dict(orient="records")



drivers = ["VER","LEC","HAM"]
D = get_track_dominance(session_name = "Hungarian Grand Prix", identifier = "Q", drivers=drivers, session_years = [2021,2022])
#print(D)
#print(len(D))
