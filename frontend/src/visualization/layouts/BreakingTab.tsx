import { useEffect, useState } from "react";
import BrakingDistributionBoxPlot from "../BrakingDistributionBoxPlot";
import { fetchTelemetry, type TelemetryResponse } from "../../api/fetchTelemetry";
import { fetchBrakingDistribution, type BrakingDistributionPoint } from "../../api/fetchBrakingDistribution";
import { fetchBrakingComparison, type BrakingPoint } from "../../api/fetchBrakingComparison";
import { BrakingComparison } from "../BrakingComparison";
import { TelemetryLineChart } from "../../components/TelemetryLineChart";

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
        flexDirection: "row",
        width: "100%",
        maxWidth: "100%",
        gap: "20px",
        overflow: "auto",
        alignItems: "flex-start",
      }}
    >
      {/* LEFT — 60% */}
      <div
        style={{
          width: "60%",
          minWidth: 0,
          flex: "0 0 60%",
          overflow: "auto",
          maxHeight: "100vh",
        }}
      >
        <section style={{ marginTop: 20 }}>
          <h3 style={{ color: "white" }}>Braking Comparison</h3>

          {loadingState && (
            <div style={{ color: "white" }}>Loading braking data...</div>
          )}

          {!loadingState && brakingData && (
            <BrakingComparison data={brakingData} />
          )}

          {!loadingState && !brakingData && (
            <div style={{ color: "#ccc" }}>
              No braking data available for this session/driver.
            </div>
          )}
        </section>

        {/* Throttle */}
        {telemetryData && (
          <section style={{ marginTop: 40, marginBottom: 40 }}>
            <h3 style={{ color: "white" }}>Throttle Input Comparison</h3>

            <TelemetryLineChart
              data={telemetryData}
              metric="Throttle"
              label="Throttle (%)"
            />
          </section>
        )}
      </div>

      {/* RIGHT — 40% */}
      <div
        id="braking-dist-container"
        style={{
          width: "40%",
          minWidth: 0,
          flex: "0 0 40%",
          background: "rgb(25, 27, 31)",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.4)",
          height: "fit-content",
          maxHeight: "900px",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <BrakingDistributionBoxPlot data={brakingDist} />
      </div>
    </div>
  );
};
