import "../App.css";
import { useEffect, useState } from "react";
import { FilterSelect } from "../components/FilterSelect";
import { raceTypes, sessions, years, drivers } from "../utils/data";
import { Button, CircularProgress } from "@mui/material";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";
import { TrackDominance } from "./TrackDominance";
import { fetchTelemetry, type TelemetryResponse } from "../api/fetchTelemetry";
import { Telemetry } from "./Telemetry";

export const Visualization = () => {
  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [telemetryData, setTelemetryData] = useState<TelemetryResponse>({});
  const [sessionYear, setSessionYear] = useState<string>("2025");
  const [sessionName, setSessionName] = useState<string>("Australian Grand Prix");
  const [sessionIdentifier, setSessionIdentifier] = useState<string>("Race");
  const [driverName, setDriverName] = useState<string>("");
  const [loadingState, setLoadingState] = useState(false);

  const sessionList = sessions[sessionYear] ?? [];
  const driverList = drivers[sessionYear] ?? [];

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const trackDominanceResponse = await fetchTrackDominance(
        sessionYear,
        sessionName,
        sessionIdentifier,
        "VER",
        "NOR"
      );

      const telemetryData = await fetchTelemetry(
        sessionYear,
        sessionName,
        sessionIdentifier,
        ["VER", "NOR"]
      );

      setData(trackDominanceResponse);
      setTelemetryData(telemetryData);
    } catch (error) {
      setLoadingState(false);
      console.error("Error fetching data:", error);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    if (data.length === 0) fetchData();
  }, []);

  useEffect(() => {
    if (sessionList.length > 0) {
      setSessionName(sessionList[0]);
    } else {
      setSessionName("");
    }

    if (driverList.length > 0) {
      setDriverName(driverList[0]);
    } else {
      setDriverName("");
    }
  }, [sessionYear]);

  return (
    <div className="visualization-container">
      <nav className="navbar">Track Dominance</nav>

      <div className="chart-container">
        <div className="filters">
          <FilterSelect
            value={sessionYear}
            setValue={setSessionYear}
            menuItems={years}
            width={120}
          />

          <FilterSelect
            value={sessionName}
            setValue={setSessionName}
            menuItems={sessions[sessionYear]}
            width={220}
          />

          <FilterSelect
            value={sessionIdentifier}
            setValue={setSessionIdentifier}
            menuItems={raceTypes}
            width={150}
          />

          <FilterSelect
            value={driverName}
            setValue={setDriverName}
            menuItems={drivers[sessionYear]}
            width={200}
          />

          <Button
            variant="contained"
            onClick={fetchData}
            disabled={!sessionYear || !sessionName || loadingState}
            sx={{
              marginLeft: "auto",
            }}
          >
            {loadingState ? (
              <CircularProgress size={20} color="primary" />
            ) : (
              "Select"
            )}
          </Button>
        </div>
        {data && !loadingState && (
          <TrackDominance data={data} />
        )}

        {/* {telemetryData && !loadingState && (
          <Telemetry data={telemetryData} />
        )} */}
      </div>
    </div>
  );
};