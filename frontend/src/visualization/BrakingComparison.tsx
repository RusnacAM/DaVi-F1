import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { BrakingPoint } from "../api/fetchBrakingComparison";

type Props = {
  data: BrakingPoint[];
  driverName: string;
};

export const BrakingComparison: React.FC<Props> = ({ data, driverName }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    if (!data || data.length === 0 || !containerRef.current) return;
    
    const container = containerRef.current;
    const height = 360;
    const margin = { top: 20, right: 40, bottom: 50, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // clear previous svg
    d3.select(container).selectAll("svg").remove();
    d3.select(container).selectAll("div").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // x scale: distance
    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.distance) as [number, number])
      .range([0, innerW]);

    // y scale: brake [0, 1]
    const y = d3.scaleLinear().domain([-0.05, 1.05]).range([innerH, 0]);

    // axes
    const xAxis = d3.axisBottom(x).ticks(10);
    const yAxis = d3.axisLeft(y).ticks(5);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .append("text")
      .attr("x", innerW / 2)
      .attr("y", 36)
      .attr("fill", "#ffffffff")
      .attr("text-anchor", "middle")
      .text("Distance along lap [m]");

    g.append("g").call(yAxis).append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -innerH / 2)
      .attr("fill", "#ffffffff")
      .attr("text-anchor", "middle")
      .text("Brake (0–1)");

    // lines
    const lineIdeal = d3
      .line<BrakingPoint>()
      .x(d => x(d.distance))
      .y(d => y(d.ideal_brake ?? 0))
      .curve(d3.curveMonotoneX);

    const lineDriver = d3
      .line<BrakingPoint>()
      .x(d => x(d.distance))
      .y(d => y(d.driver_brake ?? 0))
      .curve(d3.curveMonotoneX);

    // colors (use d3 scheme)
    const color = d3.scaleOrdinal<string>()
      .domain(["ideal", "driver"])
      .range([d3.schemeCategory10[0], d3.schemeCategory10[1]]);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color("ideal"))
      .attr("stroke-width", 2.5)
      .attr("d", lineIdeal as any);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color("driver"))
      .attr("stroke-width", 2.5)
      .attr("d", lineDriver as any);

    // legend
    const legend = svg.append("g").attr("transform", `translate(${margin.left + 10},${10})`);
    
    legend.append("circle").attr("cx", 6).attr("cy", 6).attr("r", 6).attr("fill", color("ideal"));
    legend.append("text").attr("x", 18).attr("y", 10).text("Ideal Lap (fastest overall)").attr("font-size", 12).attr("fill", "white");

    legend.append("circle").attr("cx", 200).attr("cy", 6).attr("r", 6).attr("fill", color("driver"));
    legend.append("text").attr("x", 218).attr("y", 10).text(`${driverName} — Median Lap`).attr("font-size", 12).attr("fill", "white");

    // tooltip: vertical line and text
    const tooltip = d3.select(container).append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("padding", "6px 8px")
      .style("background", "rgba(255,255,255,0.95)")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("color", "black")
      .style("display", "none");

    const overlay = g.append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .style("fill", "none")
      .style("pointer-events", "all");

    const bisect = d3.bisector<BrakingPoint, number>(d => d.distance).left;

    overlay.on("mousemove", function (event) {
      const pointer = d3.pointer(event);
      const xm = x.invert(pointer[0]);
      const i = Math.max(0, Math.min(data.length - 1, bisect(data, xm)));
      const d = data[i];
      if (!d) return;

      tooltip.style("display", "block")
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`
          <div><strong>Distance:</strong> ${d.distance.toFixed(1)} m</div>
          <div><strong>Ideal Brake:</strong> ${d.ideal_brake.toFixed(2)}</div>
          <div><strong>${driverName} Brake:</strong> ${d.driver_brake.toFixed(2)}</div>
        `);
    }).on("mouseleave", function () {
      tooltip.style("display", "none");
    });
  }, [data, driverName, width]);

  return <div ref={containerRef} style={{ width: "100%", position: "relative" }} />;
};