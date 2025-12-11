import { useEffect, useRef, useState } from "react";
import type { TelemetryPoint, TelemetryResponse } from "../api/fetchTelemetry";
import * as d3 from "d3";
import { getDriverYearColor } from "../utils/configureFilterData";

interface TelemetryLineChartProps {
  data: TelemetryResponse;
  metric: keyof TelemetryPoint;
  label: string;
  driverColorMap: Record<string, string>;
  sessionYears: string[];
}

export const TelemetryLineChart: React.FC<TelemetryLineChartProps> = ({
  data,
  metric,
  label,
  driverColorMap,
  sessionYears,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

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

    const yearDriverKeys = Object.keys(data);
    if (yearDriverKeys.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const height = 300;
    const margin = { top: 10, right: 10, bottom: 50, left: 60 };

    const allPoints = Object.entries(data).flatMap(([key, points]) =>
      points.map((p) => ({
        yearDriver: key,
        ...p,
      }))
    );

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

    const normalizeKey = (key: string) => {
      const [year, driver] = key.split("_");
      return `${driver}_${year}`;
    };
    const colorScale = (key: string) => getDriverYearColor(normalizeKey(key), driverColorMap, sessionYears);

    const line = d3
      .line<any>()
      .x((d) => xScale(d.distance))
      .y((d) => yScale(d[metric]));

    // Draw lines for each year-driver combination
    yearDriverKeys.forEach((key) => {
      svg
        .append("path")
        .datum(data[key])
        .attr("fill", "none")
        .attr("stroke", colorScale(key)!)
        .attr("stroke-width", 2)
        .attr("d", line);
    });

    // X-axis
    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .attr("color", "white");

    // Y-axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", "white");

    // X-axis label
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Distance along lap [m]");

    // Y-axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", 15)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(label);

    const updateTooltip = (mouseX: number, dist: number) => {
      if (!tooltipRef.current) return;

      // For each driver, find the nearest data point by distance
      const tooltipData = yearDriverKeys.map((key) => {
        const pts = data[key];

        // find nearest point
        const nearest = pts.reduce((prev, curr) =>
          Math.abs(curr.distance - dist) < Math.abs(prev.distance - dist)
            ? curr
            : prev
        );

        return {
          key,
          value: nearest?.[metric],
        };
      });

      tooltipRef.current.style.display = "block";
      const svgRect = svgRef.current!.getBoundingClientRect();

      tooltipRef.current.style.left = svgRect.left + mouseX + "px";
      tooltipRef.current.style.top = svgRect.top + margin.top + "px";

      tooltipRef.current.innerHTML = `
          <div style="font-weight:bold;margin-bottom:5px">
            Distance: ${dist.toFixed(1)} m
          </div>
          ${tooltipData
            .map(
              (t) => `
              <div>
                <span style="color:${colorScale(t.key)}">${t.key.replace(
                "_",
                " "
              )}</span>:
                <b>${t.value?.toFixed(2)}</b>
              </div>
            `
            )
            .join("")}
        `;
    };

    const hoverLine = svg
      .append("line")
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .style("opacity", 0);

    // Transparent overlay to capture mouse events
    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const dist = xScale.invert(mouseX);

        setHoverX(dist);

        hoverLine.attr("x1", mouseX).attr("x2", mouseX).style("opacity", 1);

        updateTooltip(mouseX, dist);
      })
      .on("mouseleave", () => {
        hoverLine.style("opacity", 0);
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });
  }, [data, metric, label, width]);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <svg ref={svgRef} width={width} height={300}></svg>
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          pointerEvents: "none",
          padding: "8px 10px",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          fontSize: "12px",
          borderRadius: "6px",
          transform: "translate(-50%, -120%)",
          display: "none",
          zIndex: 20,
        }}
      />
    </div>
  );
};
