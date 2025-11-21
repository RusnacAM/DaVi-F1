import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!data) return;

    const drivers = Object.keys(data);
    if (drivers.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 300;
    const margin = 40;

    const allPoints = Object.entries(data).flatMap(([driver, points]) =>
      points.map((p) => ({
        driver,
        ...p,
      }))
    );

    const xExtent = d3.extent(allPoints, (d) => d.time) as [number, number];
    const yExtent = d3.extent(allPoints, (d) => d[metric]) as [number, number];

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
      .domain(drivers)
      .range(d3.schemeTableau10);

    const line = d3
      .line<any>()
      .x((d) => xScale(d.time))
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
      .attr("transform", `translate(0, ${height - margin})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr("color", "white");

    svg
      .append("g")
      .attr("transform", `translate(${margin}, 0)`)
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", "white");

    svg
      .append("text")
      .attr("x", margin)
      .attr("y", margin / 2)
      .attr("fill", "white")
      .style("font-size", "14px")
      .text(label ?? metric);
  }, [data, metric]);

  return <svg ref={svgRef} width={1200} height={300}></svg>;
};
