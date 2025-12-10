import React, { useEffect, useState } from "react";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../../api/fetchTrackDominance";
import { TrackDominance } from "../TrackDominance";
import { LapGapEvolution } from "../LapGapEvolution";
import {
  fetchLapGapEvolution,
  type LapGapEvolutionResponse,
} from "../../api/fetchLapGapEvolution";
import { CircularProgress } from "@mui/material";
import { fetchAvgDiffs, type AvgDiffsResponse } from "../../api/fetchAvgDiffs";
import { AvgDiffsChart } from "../AvgDiffs";

export interface TrackTabProps {
  sessionYears: string[];
  sessionName: string;
  sessionIdentifier: string;
  driverNames: string[];
  refreshKey: number;
  driverColorMap: Record<string, string>;
}

export const TrackTab: React.FC<TrackTabProps> = ({
  sessionYears,
  sessionName,
  sessionIdentifier,
  driverNames,
  refreshKey,
  driverColorMap,
}) => {
  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [AvgDiffsData, setDataAvgDiffs] = useState<AvgDiffsResponse>([]);
  const [data_lap_gap_evolution, setDataLapGapEvolution] = useState<LapGapEvolutionResponse>({lapGaps: {}, corners: [],});
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
      const responseAvgDiffs = await fetchAvgDiffs(
        sessionName,
        sessionIdentifier,
        driverNames,
        sessionYears
      );
      const responseLapGapEvolution = await fetchLapGapEvolution(
        sessionName,
        sessionIdentifier,
        driverNames,
        sessionYears
      );

      setData(response);
      setDataAvgDiffs(responseAvgDiffs);
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
            sessionYears={sessionYears}
            driverColorMap={driverColorMap}
          />
        ) : (
          <CircularProgress size={50} color="primary" />
        )}
      </div>

      <div className="supporting-charts">
        <div className="avg-diffs-chart">
          {AvgDiffsData && !loadingState ? (
            <AvgDiffsChart
              data={AvgDiffsData}
              sessionYears={sessionYears}
              driverColorMap={driverColorMap}
            />
          ) : (
            <CircularProgress size={50} color="primary" />
          )}
        </div>

        <div className="lap-gap-evolution-chart">
          {data_lap_gap_evolution && !loadingState ? (
            <LapGapEvolution
              lapGaps={data_lap_gap_evolution.lapGaps}
              sessionYears={sessionYears}
              corners={data_lap_gap_evolution.corners}
              driverColorMap={driverColorMap}
            />
          ) : (
            <CircularProgress size={50} color="primary" />
          )}
        </div>
      </div>
    </div>
  );
};
