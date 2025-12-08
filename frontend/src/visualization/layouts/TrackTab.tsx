import React, { useEffect, useState } from "react";
import {
  fetchTrackDominance,
  type TrackDominanceResponse,
} from "../../api/fetchTrackDominance";
import { TrackDominance } from "../TrackDominance";
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
        {/* <img src={areaChart} alt="Logo" width={700} height={300} />
        <img src={barChart} alt="Logo" width={700} height={300} /> */}
      </div>
    </div>
  );
};
