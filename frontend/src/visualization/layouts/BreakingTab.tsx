import { useEffect, useState } from "react";
import BrakingDistributionBoxPlot from "../BrakingDistributionBoxPlot";
import {
  fetchBrakingDistribution,
  type BrakingDistributionPoint,
} from "../../api/fetchBrakingDistribution";
import {
  fetchBrakingComparison,
  type BrakingPoint,
} from "../../api/fetchBrakingComparison";
import { BrakingComparison } from "../BrakingComparison";
import { CircularProgress } from "@mui/material";

export interface BreakingTabProps {
  sessionYears: string[];
  sessionName: string;
  sessionIdentifier: string;
  driverNames: string[];
  refreshKey: number;
  driverColorMap: Record<string, string>;
}

export const BreakingTab: React.FC<BreakingTabProps> = ({
  sessionYears,
  sessionName,
  sessionIdentifier,
  driverNames,
  refreshKey,
  driverColorMap,
}) => {
  const [brakingData, setBrakingData] = useState<Record<string,BrakingPoint[]> | null>(null);
  const [brakingDist, setBrakingDist] = useState<BrakingDistributionPoint[]>([]);
  const [loadingState, setLoadingState] = useState(false);
  const [comparisonHeight, setComparisonHeight] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const brakingResp = await fetchBrakingComparison(
        sessionYears,
        sessionName,
        sessionIdentifier,
        driverNames
      );

      const brakingDistResp = await fetchBrakingDistribution(
        sessionYears,
        sessionName,
        sessionIdentifier,
        driverNames
      );

      setBrakingData(
        brakingResp && Object.keys(brakingResp).length ? brakingResp : null
      );
      setBrakingDist(brakingDistResp);
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "100%",
        gap: "1px",
        overflowX: "hidden",
        overflowY: "auto",
        alignItems: "center",
        padding: "1px 0",
      }}
    >
      {/* TOP ROW: Braking Comparison (left) + Box Plot (right) */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "90%",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: Braking Comparison (60%) */}
        <section style={{ width: "60%", minWidth: 0 }}>
          <h3 style={{ color: "white", marginBottom: "10px" }}>
            Braking Comparison
          </h3>

          {loadingState ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px 0",
              }}
            >
              <CircularProgress size={50} color="primary" />
            </div>
          ) : brakingData ? (
            <BrakingComparison 
              data={brakingData} 
              driverColorMap={driverColorMap} 
              sessionYears={sessionYears}
              onHeightChange={setComparisonHeight}
            />
          ) : (
            <div style={{ color: "#ccc" }}>
              No braking data available for this session/driver.
            </div>
          )}
        </section>

        {/* RIGHT: Braking Distribution Box Plot (40%) */}
        <section
          style={{
            width: "40%",
            minWidth: 0,
          }}
        >
          <h3 style={{ color: "white", marginBottom: "10px" }}>
            Braking Distance Distribution
          </h3>

          {loadingState ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px 0",
              }}
            >
              <CircularProgress size={50} color="primary" />
            </div>
          ) : (
            <BrakingDistributionBoxPlot data={brakingDist} dynamicHeight={comparisonHeight ?? undefined}/>
          )}
        </section>
      </div>
    </div>
  );
};