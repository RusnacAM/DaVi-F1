import React, { useEffect, useState } from "react";
import * as d3 from "d3";
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
import {
  driverCode,
  getDriverYearColor,
} from "../../utils/configureFilterData";

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
  refreshKey,
}) => {
  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [AvgDiffsData, setDataAvgDiffs] = useState<AvgDiffsResponse>([]);
  const [data_lap_gap_evolution, setDataLapGapEvolution] =
    useState<LapGapEvolutionResponse>([]);
  const [loadingState, setLoadingState] = useState(false);

  const driverCodes = driverNames.map((d) => driverCode[d]);
  const baseColors = d3.schemeTableau10;
  const driverColorMap: Record<string, string> = {};
  driverCodes.forEach((code, i) => {
    driverColorMap[code] = baseColors[i % baseColors.length];
  });

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
      console.log(responseLapGapEvolution);
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
    <>
      <div className="legend-container" style={{ marginBottom: "20px" }}>
        {driverNames.flatMap((driverName) => {
          const code = driverCode[driverName];

          return sessionYears.map((year) => {
            const key = `${code}_${year}`;
            const color = getDriverYearColor(key, driverColorMap, sessionYears);

            return (
              <div className="legend-color-block">
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    backgroundColor: color,
                    borderRadius: "3px",
                    marginRight: "6px",
                  }}
                />
                <span>
                  {code} {year}
                </span>
              </div>
            );
          });
        })}
      </div>

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

        <div className="supporting-chart">
          <div className="AvgDiffs-Chart">
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

          <div className="lap-gap-evolution">
            {data_lap_gap_evolution && !loadingState ? (
              <LapGapEvolution data={data_lap_gap_evolution} driverColorMap={driverColorMap} sessionYears={sessionYears} />
            ) : (
              <CircularProgress size={50} color="primary" />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
