import { useEffect, useRef, useState } from "react";
import type { TelemetryPoint, TelemetryResponse } from "../api/fetchTelemetry";
import * as d3 from "d3";

interface TelemetryLineChartProps {
  data: TelemetryResponse;
  metric: keyof TelemetryPoint;
  label: string;
}

export const TelemetryLineChart: React.FC<TelemetryLineChartProps> = ({
  data,
  metric,
  label,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  // Update width when container resizes
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!data) return;

    const drivers = Object.keys(data);
    if (drivers.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const height = 300;
    const margin = { top: 40, right: 40, bottom: 50, left: 60 };

    const allPoints = Object.entries(data).flatMap(([driver, points]) =>
      points.map((p) => ({
        driver,
        ...p,
      }))
    );

    // Changed from 'd.distance' to 'd.time'
    const xExtent = d3.extent(allPoints, (d) => d.distance) as [number, number];
    const yExtent = d3.extent(allPoints, (d) => d[metric]) as [number, number];

    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([margin.left, width - margin.right]);
    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([height - margin.bottom, margin.top]);

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(drivers)
      .range(d3.schemeTableau10);

    const line = d3
      .line<any>()
      .x((d) => xScale(d.distance))
      .y((d) => yScale(d[metric]));

    drivers.forEach((driver) => {
      svg
        .append("path")
        .datum(data[driver])
        .attr("fill", "none")
        .attr("stroke", colorScale(driver)!)
        .attr("stroke-width", 2)
        .attr("d", line);
    });

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .attr("color", "white");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", "white");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Distance along lap [m]");
  }, [data, metric, width]);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg ref={svgRef} width={width} height={300}></svg>
    </div>
  );
};