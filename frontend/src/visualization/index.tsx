import "../App.css";
import { useEffect, useState } from "react";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";
import barChart from "../../public/images/bar_chart.jpeg";
import { CircularProgress } from "@mui/material";
import { TrackDominance } from "./TrackDominance";
import { LapGapEvolution } from "./LapGapEvolution";
import { fetchLapGapEvolution, type LapGapEvolutionResponse } from "../api/fetchLapGapEvolution";

export const Visualization = () => {
  const { sessionYears, sessionName, sessionIdentifier, driverNames } =
    useFilterConfigs();

  const [data_track_dominance, setDataTrackDominance] = useState<TrackDominanceResponse>([]);
  const [data_lap_gap_evolution, setDataLapGapEvolution] = useState<LapGapEvolutionResponse>([]);
  const [loadingState, setLoadingState] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const responseTrackDominance = await fetchTrackDominance(
        sessionName,
        sessionIdentifier,
        driverNames,
        sessionYears
      );
      setDataTrackDominance(responseTrackDominance);

      const responseLapGapEvolution = await fetchLapGapEvolution(
        sessionName,
        sessionIdentifier,
        driverNames,
        sessionYears
      );
      setDataLapGapEvolution(responseLapGapEvolution);
    } catch (error) {
      setLoadingState(false);
      console.error("Error fetching data:", error);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    if (data_track_dominance.length === 0) fetchData();
  }, []);

  return (
    <>
      <nav className="navbar">
        <FilterMenu onClickSelect={fetchData} isLoading={loadingState} />
      </nav>

      <div className="chart-container">
        <div className="track-map">
          {data_track_dominance && !loadingState ? (
            <TrackDominance
              data={data_track_dominance}
              driverNames={driverNames}
              sessionYears={sessionYears}
            />
          ) : (
            <CircularProgress size={50} color="primary" />
          )}
        </div>
        <div className="supporting-chart">
          <div className="lap-gap-evolution">
            {data_lap_gap_evolution && !loadingState ? (
            <LapGapEvolution
              data={data_lap_gap_evolution}
            />
          ) : (
            <CircularProgress size={50} color="primary" />
          )}
          </div>
          <img src={barChart} alt="Logo" width={700} height={300} />
        </div>
      </div>
    </>
  );
};
