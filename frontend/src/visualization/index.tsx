import "../App.css";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { FilterSelect } from "../components/FilterSelect";
import { raceTypes, sessions, years, drivers } from "../utils/data";
import { Button, CircularProgress } from "@mui/material";
import {
  fetchTrackDominance,
  type TrackDominancePoint,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";

export const Visualization = () => {
  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [sessionYear, setSessionYear] = useState<string>("2025");
  const [sessionName, setSessionName] = useState<string>("Australian Grand Prix");
  const [sessionIdentifier, setSessionIdentifier] = useState<string>("Race");
  const [driverName, setDriverName] = useState<string>("");
  const [loadingState, setLoadingState] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const sessionList = sessions[sessionYear] ?? [];
  const driverList = drivers[sessionYear] ?? [];

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await fetchTrackDominance(
        sessionYear,
        sessionName,
        sessionIdentifier,
        driverName
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

  useEffect(() => {
    if (sessionList.length > 0) {
      setSessionName(sessionList[0]);
    } else {
      setSessionName("");
    }

    if (driverList.length > 0) {
      setDriverName(driverList[0]);
    } else {
      setDriverName("");
    }
  }, [sessionYear]);

  return (
    <div className="visualization-container">
      <nav className="navbar">Track Dominance</nav>

      <div className="chart-container">
        <div className="filters">
          <FilterSelect
            value={sessionYear}
            setValue={setSessionYear}
            menuItems={years}
            width={120}
          />

          <FilterSelect
            value={sessionName}
            setValue={setSessionName}
            menuItems={sessions[sessionYear]}
            width={220}
          />

          <FilterSelect
            value={sessionIdentifier}
            setValue={setSessionIdentifier}
            menuItems={raceTypes}
            width={150}
          />

          <FilterSelect
            value={driverName}
            setValue={setDriverName}
            menuItems={drivers[sessionYear]}
            width={200}
          />

          <Button
            variant="contained"
            onClick={fetchData}
            disabled={!sessionYear || !sessionName || loadingState}
            sx={{
              marginLeft: "auto",
            }}
          >
            {loadingState ? (
              <CircularProgress size={20} color="primary" />
            ) : (
              "Select"
            )}
          </Button>
        </div>
        {data && !loadingState && (
          <svg ref={svgRef} width={700} height={500}></svg>
        )}
      </div>
    </div>
  );
};