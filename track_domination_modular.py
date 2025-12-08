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

    #Find the fastest driver per minisector
    fastest_per_min = avg_speed.groupby('Minisector')['Speed'].idxmax()

    #Extract fastest speeds and drivers
    fastest_s = avg_speed.loc[fastest_per_min][['Minisector', 'Speed']].rename(columns={'Speed': 'FastestSpeed'})
    fastest_d = avg_speed.loc[fastest_per_min][['Minisector', 'DriverYear']].rename(columns={'DriverYear': 'Fastest'})

    #Merge fastest_s in avg_speed on 'Minisector' to calculate speed loss
    avg_speed = avg_speed.merge(fastest_s, on='Minisector')
    avg_speed['SpeedGain'] = avg_speed['FastestSpeed'] - avg_speed['Speed']

    #Find the average speed loss per minisector
    avg_speed_gain = (
        avg_speed
        .groupby('Minisector')['SpeedGain']
        .mean()
        .reset_index()
    )

    #Get sector lengths
    sector_lengths = []
    for i in range(1, len(sector_bounds)):
        sector_lengths.append(sector_bounds[i] - sector_bounds[i-1])
    sector_length_df = pd.DataFrame({
        'Minisector': list(range(1, len(sector_bounds))),
        'SectorLength': sector_lengths
    })

    #Merge sector lengths to avg_speed_loss
    avg_speed_gain = avg_speed_gain.merge(sector_length_df, on='Minisector')

    #Find average time loss (in seconds) per minisector
    avg_speed_gain['AvgTimeGain'] = (avg_speed_gain['SpeedGain'] * avg_speed_gain['SectorLength']) / 3600

    telemetry_all = telemetry_all.merge(fastest_d, on='Minisector')
    telemetry_all = telemetry_all.merge(avg_speed_gain[['Minisector', 'AvgTimeGain']], on='Minisector')
    telemetry_all = telemetry_all.sort_values(by=['Distance'])

    result = pd.DataFrame({
        "x": telemetry_all["X"],
        "y": telemetry_all["Y"],
        "minisector": telemetry_all["Minisector"],
        "fastest_driver": telemetry_all["Fastest"],
        "TimeGain": round(telemetry_all["AvgTimeGain"],2)
    })

    return result.to_dict(orient="records")

drivers = ["VER","LEC","HAM"]
D = get_track_dominance(session_name = "Hungarian Grand Prix", identifier = "Q", drivers=drivers, session_years = [2021,2022])
print(D)

"""
#Visualize the result (for testing purposes)
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import matplotlib.colors as mcolors

x = [point['x'] for point in D]
y = [point['y'] for point in D]
fastest_driver = [point['fastest_driver'] for point in D]
unique_drivers = list(set(fastest_driver))

colors = plt.cm.get_cmap('tab10', len(unique_drivers))
driver_color_map = {driver: colors(i) for i, driver in enumerate(unique_drivers)}
driver_colors = [driver_color_map[driver] for driver in fastest_driver]
plt.figure(figsize=(10, 6))
plt.scatter(x, y, c=driver_colors, s=1)
plt.title('Track Domination Visualization')
plt.xlabel('X Coordinate')
plt.ylabel('Y Coordinate')
legend_elements = [Line2D([0], [0], marker='o', color='w', label=driver,
                          markerfacecolor=driver_color_map[driver], markersize=10) for driver in unique_drivers]
plt.legend(handles=legend_elements, title='Fastest Driver', bbox_to_anchor=(1.05, 1), loc='upper left')
plt.tight_layout()
plt.show()
"""