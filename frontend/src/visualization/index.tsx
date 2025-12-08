import "../App.css";
import { useEffect, useState } from "react";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";
import areaChart from "../../public/images/area_chart.jpeg";
import barChart from "../../public/images/bar_chart.jpeg";
import { CircularProgress } from "@mui/material";
import { TrackDominance } from "./TrackDominance";
import { AvgDiffsChart } from "../visualization/AvgDiffs.tsx";

export const Visualization = () => {
  const { sessionYears, sessionName, sessionIdentifier, driverNames } =
    useFilterConfigs();

  const [data, setData] = useState<TrackDominanceResponse>([]);
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
        <div className="supporting-chart">
          <img src={areaChart} alt="Logo" width={700} height={300} />
          <img src={barChart} alt="Logo" width={700} height={300} />
        </div>
      </div>
    </>
  );
};
