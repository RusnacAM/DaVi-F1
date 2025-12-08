import "../App.css";
import { useEffect, useState } from "react";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";
import { TrackDominance } from "./TrackDominance";
import {
  fetchAvgDiffs,
  type AvgDiffsResponse,
} from "../api/fetchAvgDiffs";
import { AvgDiffsChart } from "./AvgDiffs";

import { CircularProgress } from "@mui/material";


export const Visualization = () => {
  const { sessionYears, sessionName, sessionIdentifier, driverNames } =
    useFilterConfigs();

  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [AvgDiffsData, setDataAvgDiffs] = useState<AvgDiffsResponse>([]);
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

      const responseAvgDiffs = await fetchAvgDiffs(
        sessionName,
        sessionIdentifier,
        driverNames,
        sessionYears
      );
      setDataAvgDiffs(responseAvgDiffs);
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
    <>
      <nav className="navbar">
        <FilterMenu onClickSelect={fetchData} isLoading={loadingState} />
      </nav>

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
      <div className = "chart-container-avgdiffs">
          <div className ="AvgDiffs-Chart">
          {AvgDiffsData && !loadingState ? (
            <AvgDiffsChart
              data={AvgDiffsData}
            />
          ) : (
            <CircularProgress size={50} color="primary" />
          )}
        </div>
        </div>
      </div>
      </>
  );
};