import { useEffect, useState } from "react";
import BrakingDistributionBoxPlot from "../BrakingDistributionBoxPlot";
import { fetchTelemetry, type TelemetryResponse } from "../../api/fetchTelemetry";
import { fetchBrakingDistribution, type BrakingDistributionPoint } from "../../api/fetchBrakingDistribution";
import { fetchBrakingComparison, type BrakingPoint } from "../../api/fetchBrakingComparison";
import { BrakingComparison } from "../BrakingComparison";
import { TelemetryLineChart } from "../../components/TelemetryLineChart";
import { CircularProgress } from "@mui/material";

export interface BreakingTabProps {
  sessionYears: string[];
  sessionName: string;
  sessionIdentifier: string;
  driverNames: string[];
  refreshKey: number;
}

export const BreakingTab: React.FC<BreakingTabProps> = ({
  sessionYears,
  sessionName,
  sessionIdentifier,
  driverNames,
  refreshKey
}) => {
  const [telemetryData, setTelemetryData] = useState<TelemetryResponse | null>(null);
  const [brakingData, setBrakingData] = useState<Record<string, BrakingPoint[]> | null>(null);
  const [brakingDist, setBrakingDist] = useState<BrakingDistributionPoint[]>([]);
  
  const [loadingState, setLoadingState] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const brakingResp = await fetchBrakingComparison(
        sessionYears,
        sessionName,
        sessionIdentifier,
        driverNames
      );

      const telemetryResp = await fetchTelemetry(
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

      setBrakingData(brakingResp && Object.keys(brakingResp).length ? brakingResp : null);
      setTelemetryData(
        telemetryResp && Object.keys(telemetryResp).length
          ? telemetryResp
          : null
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
        gap: "40px",
        overflow: "auto",
        alignItems: "center", // center the children horizontally
        padding: "10px 0",
      }}
    >
    {/* Braking Comparison */}
    <section style={{ width: "80%", margin: "0 auto" }}>
      <h3 style={{ color: "white", marginBottom: "10px" }}>Braking Comparison</h3>

      {loadingState ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <CircularProgress size={50} color="primary" />
        </div>
      ) : brakingData ? (
        <BrakingComparison data={brakingData} />
      ) : (
        <div style={{ color: "#ccc" }}>
          No braking data available for this session/driver.
        </div>
      )}
    </section>

    {/* Throttle Line Chart */}
    <section style={{ width: "80%", margin: "0 auto" }}>
      <h3 style={{ color: "white", marginBottom: "10px" }}>Throttle Input Comparison</h3>

      {loadingState ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <CircularProgress size={50} color="primary" />
        </div>
      ) : telemetryData ? (
        <TelemetryLineChart
          data={telemetryData}
          metric="Throttle"
          label="Throttle (%)"
        />
      ) : null}
    </section>

    {/* Braking Distribution Box Plot */}
    <section style={{ width: "60%", margin: "0 auto" }}>
      <h3 style={{ color: "white", marginBottom: "10px" }}>Braking Distance Distribution</h3>

      {loadingState ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <CircularProgress size={50} color="primary" />
        </div>
      ) : (
        <BrakingDistributionBoxPlot data={brakingDist} />
      )}
    </section>

    </div>
  );
};
