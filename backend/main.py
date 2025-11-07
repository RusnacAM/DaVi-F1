from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import fastf1 as ff1
import pandas as pd

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
def get_gear_data(session_year: int, session_name: str):
    session = ff1.get_session(session_year, session_name, 'Q')
    session.load()

    lap = session.laps.pick_fastest()
    telemetry = lap.get_telemetry()
    
    data = pd.DataFrame({
      "x": telemetry["X"],
      "y": telemetry["Y"],
      "gear": telemetry["nGear"].astype(int)
    })
    
    return data.to_dict(orient="records")