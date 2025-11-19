import "../App.css";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { fetchGearData, type GearDataResponse } from "../api/fetchGearData";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";

export const Visualization = () => {

  const {
    sessionYears,
    sessionName,
    sessionIdentifiers,
    driverNames

  } = useFilterConfigs();

  const [data, setData] = useState<GearDataResponse | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await fetchGearData(
        sessionYears[0],
        sessionName,
        sessionIdentifiers[0],
        driverNames[0]
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


  return (
    <div className="visualization-container">
      <nav className="navbar">Fastest Lap Gear Shifts</nav>

      <div className="chart-container">
        <FilterMenu 
          onClickSelect={fetchData}
          isLoading={loadingState}
        />

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
