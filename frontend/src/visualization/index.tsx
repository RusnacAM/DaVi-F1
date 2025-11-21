import "../App.css";
import { useEffect, useState } from "react";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";
import { TrackDominance } from "./TrackDominance";
import { fetchTelemetry, type TelemetryResponse } from "../api/fetchTelemetry";
import { Telemetry } from "./Telemetry";

export const Visualization = () => {

  const {
    sessionYears,
    sessionName,
    sessionIdentifiers,
    driverNames
  } = useFilterConfigs();

  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [loadingState, setLoadingState] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const trackDominanceResponse = await fetchTrackDominance(
        sessionYears[0],
        sessionName,
        sessionIdentifiers[0],
        driverNames
      );

      const telemetryData = await fetchTelemetry(
        sessionYears[0],
        sessionName,
        sessionIdentifiers[0],
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


  return (
    <div className="visualization-container">
      <nav className="navbar">Track Dominance</nav>

      <div className="chart-container">
        <FilterMenu 
          onClickSelect={fetchData}
          isLoading={loadingState}
        />
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