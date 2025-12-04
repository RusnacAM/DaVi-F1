import "../App.css";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import { TelemetryLineChart } from "../components/TelemetryLineChart";
import {
  fetchTrackDominance,
  type TrackDominancePoint,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";

import {
  fetchBrakingComparison,
  type BrakingPoint
} from "../api/fetchBrakingComparison";

import { BrakingComparison } from "../visualization/BrakingComparison";

import {
  fetchTelemetry,
  type TelemetryResponse
} from "../api/fetchTelemetry";

import BrakingDistributionBoxPlot from "../visualization/BrakingDistributionBoxPlot";

import {
  fetchBrakingDistribution,
  type BrakingDistributionPoint
} from "../api/fetchBrakingDistribution";

export const Visualization = () => {

  const {
    sessionYears,
    sessionName,
    sessionIdentifiers,
    driverNames
  } = useFilterConfigs();

  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [telemetryData, setTelemetryData] = useState<TelemetryResponse | null>(null);
  const [brakingData, setBrakingData] = useState<BrakingPoint[] | null>(null);
  const [activeTab, setActiveTab] = useState<"dominance" | "braking">("dominance");
  const [loadingState, setLoadingState] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [brakingDist, setBrakingDist] = useState<BrakingDistributionPoint[]>([]);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await fetchTrackDominance(
        sessionYears[0],
        sessionName,
        sessionIdentifiers[0],
        driverNames
      );
      setData(response);

      const mainDriver = driverNames[0];
      const brakingResp = await fetchBrakingComparison(
        sessionYears[0],
        sessionName,
        sessionIdentifiers[0],
        mainDriver
      );

      setBrakingData(brakingResp && brakingResp.length ? brakingResp : null);

      const telemetryResp = await fetchTelemetry(
        sessionYears[0],
        sessionName,
        sessionIdentifiers[0],
        driverNames
      );

      setTelemetryData(
        telemetryResp && Object.keys(telemetryResp).length
          ? telemetryResp
          : null
      );
      const brakingDistResp = await fetchBrakingDistribution(
        sessionYears[0],
        sessionName,
        sessionIdentifiers[0],
        driverNames
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
    if (data.length === 0) fetchData();
  }, []);

  useEffect(() => {
    if (!data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 700;
    const height = 500;
    const margin = 10;

    const xExtent = d3.extent(data, (d) => d.x) as [number, number];
    const yExtent = d3.extent(data, (d) => d.y) as [number, number];

    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([margin, width - margin]);
    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([height - margin, margin]);

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain([...new Set(data.map((d) => d.fastest_driver))])
      .range(d3.schemeTableau10);

    const sectors = d3.group(data, (d) => d.minisector);

    const line = d3
      .line<TrackDominancePoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    for (const [, points] of sectors) {
      svg
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", colorScale(points[0].fastest_driver)!)
        .attr("stroke-width", 8)
        .attr("d", line);

      const midIndex = Math.floor(points.length / 2);
      const midPoint = points[midIndex];

      // Add minisector label
      svg
        .append("text")
        .attr("x", xScale(midPoint.x))
        .attr("y", yScale(midPoint.y))
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("font-size", 10)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .attr("paint-order", "stroke") // keeps text visible over bright lines
        .text(midPoint.minisector);
    }

    // --- Legend ---
    const drivers = Array.from(new Set(data.map((d) => d.fastest_driver)));
    const legend = svg
      .selectAll(".legend")
      .data(drivers)
      .enter()
      .append("g")
      .attr("transform", (_, i) => `translate(0, ${30 + i * 20})`);

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (d) => colorScale(d)!);

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("font-size", 12)
      .attr("fill", "white")
      .text((d) => d);
  }, [data]);


  return (
    <div className="visualization-container">
      <nav className="navbar">Track Dominance</nav>

      <div className="chart-container">
        <FilterMenu 
          onClickSelect={fetchData}
          isLoading={loadingState}
        />
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <button
            onClick={() => setActiveTab("dominance")}
            style={{
              color: "black",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: activeTab === "dominance" ? "#ddd" : "#f7f7f7",
              fontWeight: activeTab === "dominance" ? "600" : "400",
            }}
          >
            Track Dominance
          </button>

          <button
            onClick={() => setActiveTab("braking")}
            style={{
              color: "black",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: activeTab === "braking" ? "#ddd" : "#f7f7f7",
              fontWeight: activeTab === "braking" ? "600" : "400",
            }}
          >
            Braking Comparison
          </button>
        </div>
        {activeTab === "dominance" && (
          <>
            {data && !loadingState && (
              <svg ref={svgRef} width={700} height={500}></svg>
            )}
          </>
        )}

        {activeTab === "braking" && (
          <div style={{ display: "flex", flexDirection: "row", width: "100%", maxWidth: "100%", gap: "20px", overflow: "auto", alignItems: "flex-start" }}>
            
            {/* LEFT — 60% */}
            <div style={{ width: "60%", minWidth: 0, flex: "0 0 60%", overflow: "auto", maxHeight: "100vh" }}>
              <section style={{ marginTop: 20 }}>
                <h3 style={{ color: "white" }}>
                  Braking Comparison — Ideal Lap vs {driverNames[0]}
                </h3>

                {loadingState && (
                  <div style={{ color: "white" }}>Loading braking data...</div>
                )}

                {!loadingState && brakingData && (
                  <BrakingComparison 
                    data={brakingData}
                    driverName={driverNames[0]}
                  />
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
        )}
      </div>
    </div>
  );
};