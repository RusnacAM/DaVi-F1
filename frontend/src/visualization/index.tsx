import "../App.css";
import { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { fetchTelemetry, type TelemetryResponse } from "../api/fetchTelemetry";

export const Visualization = () => {
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [loadingState, setLoadingState] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await fetchTelemetry("VET", "2019", "Monza");
      setData(response);
      setLoadingState(false);
    } catch (error) {
      setLoadingState(false);
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (!data) fetchData();
  });

  return (
    <div className="visualization-container">
      <h1 className="visualization-title">Get F1 Data</h1>
      <div className="visualization-chart">
        {loadingState && <p>Loading data...</p>}
        {data && (
          <Plot
            data={[
              {
                x: data.distance,
                y: data.speed,
                type: "scatter",
                marker: { color: "red" },
              },
            ]}
            layout={{
              width: 800,
              height: 500
            }}
            config={{ responsive: true }}
          />
        )}
      </div>
    </div>
  );
};