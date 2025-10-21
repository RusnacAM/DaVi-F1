import axios from "axios";
import "../App.css";
import { useEffect, useState } from "react";
import Plot from "react-plotly.js";

export const Visualization = () => {
  const [data, setData] = useState(null);
  const [loadingState, setLoadingState] = useState(false);

  const apiClient = axios.create({
    baseURL: "http://127.0.0.1:8000/api/v1",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await apiClient.get(
        "/telemetry?driver=VET&session_year=2019&session_name=Monza"
      );
      setData(response.data);
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
    <>
      <h1>Get F1 Data</h1>
      <div>
        {loadingState && <p>Loading data...</p>}
        {data && (
          <Plot
            data={[
              {
                x: data["distance"],
                y: data["speed"],
                type: "scatter",
                marker: { color: "red" },
              },
            ]}
            layout={{
              width: 800,
              height: 500
            }}
          />
        )}
      </div>
    </>
  );
};