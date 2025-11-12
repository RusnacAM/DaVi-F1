import "../App.css";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { fetchGearData, type GearDataResponse } from "../api/fetchGearData";
import { FilterSelect } from "../components/FilterSelect";
import { raceTypes, sessions, years, drivers } from "../utils/data";
import { Button, CircularProgress } from "@mui/material";

export const Visualization = () => {
  const [data, setData] = useState<GearDataResponse | null>(null);
  const [sessionYear, setSessionYear] = useState<string>("2025");
  const [sessionName, setSessionName] = useState<string>("");
  const [sessionIdentifier, setSessionIdentifier] = useState<string>("Race");
  const [driverName, setDriverName] = useState<string>("");
  const [loadingState, setLoadingState] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const sessionList = sessions[sessionYear] ?? [];
  const driverList = drivers[sessionYear] ?? [];

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await fetchGearData(
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
    if (!data) fetchData();
  }, []);

  useEffect(() => {
    if (!data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
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

    const gearColor = d3
      .scaleOrdinal<number, string>()
      .domain([1, 2, 3, 4, 5, 6, 7, 8])
      .range(d3.schemePaired);

    for (let i = 0; i < data.length - 1; i++) {
      svg
        .append("line")
        .attr("x1", xScale(data[i].x))
        .attr("y1", yScale(data[i].y))
        .attr("x2", xScale(data[i + 1].x))
        .attr("y2", yScale(data[i + 1].y))
        .attr("stroke", gearColor(data[i].gear))
        .attr("stroke-width", 15)
        .attr("stroke-linecap", "round");
    }

    const tooltip = d3
      .select(".visualization-container")
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#fff")
      .style("padding", "4px 8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("visibility", "hidden");

    // Add invisible circles for hover
    svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 6) // small radius for easy hover
      .attr("fill", "transparent")
      .on("mouseover", (_, d) => {
        tooltip.style("visibility", "visible").text(`Gear: ${d.gear}`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", event.pageY + 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });
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
      <nav className="navbar">Fastest Lap Gear Shifts</nav>

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

        <div className="visualization-chart">
          {loadingState && <p>Loading data...</p>}
          {data && !loadingState && (
            <svg ref={svgRef} width={800} height={600}></svg>
          )}
        </div>
      </div>
    </div>
  );
};
