import React, { useEffect, useState } from "react";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../../api/fetchTrackDominance";
import { TrackDominance } from "../TrackDominance";
import { LapGapEvolution } from "../LapGapEvolution";
import { fetchLapGapEvolution, 
  type LapGapEvolutionResponse 
} from "../../api/fetchLapGapEvolution";
import { CircularProgress } from "@mui/material";

export interface TrackTabProps {
  sessionYears: string[];
  sessionName: string;
  sessionIdentifier: string;
  driverNames: string[];
  refreshKey: number;
}

export const TrackTab: React.FC<TrackTabProps> = ({
  sessionYears,
  sessionName,
  sessionIdentifier,
  driverNames,
  refreshKey
}) => {
  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [data_lap_gap_evolution, setDataLapGapEvolution] = useState<LapGapEvolutionResponse>([]);
  const [loadingState, setLoadingState] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await fetchTrackDominance(
        sessionName,
        sessionIdentifier,
        driverNames,
        sessionYears
      );
      setData(response);

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
    fetchData();
  }, [refreshKey]);

  return (
    <div className="chart-container">
      <div className="track-map">
        {data && !loadingState ? (
          <TrackDominance
            data={data}
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
        {/* <img src={areaChart} alt="Logo" width={700} height={300} />
        <img src={barChart} alt="Logo" width={700} height={300} /> */}
      </div>
    </div>
  );
};
