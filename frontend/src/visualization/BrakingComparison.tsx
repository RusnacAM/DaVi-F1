import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { BrakingPoint } from "../api/fetchBrakingComparison";

type Props = {
  data: Record<string, BrakingPoint[]>;  // Changed from BrakingPoint[]
};

export const BrakingComparison: React.FC<Props> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1200);

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
    if (!data || Object.keys(data).length === 0 || !containerRef.current) return;
    
    const container = containerRef.current;
    const height = 360;
    const margin = { top: 60, right: 40, bottom: 50, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

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

    // Get first dataset to determine ideal brake line and distance range
    const firstKey = Object.keys(data)[0];
    const firstData = data[firstKey];
    
    const x = d3
      .scaleLinear()
      .domain(d3.extent(firstData, (d) => d.distance) as [number, number])
      .range([0, innerW]);

    const y = d3.scaleLinear().domain([-0.05, 1.05]).range([innerH, 0]);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(10))
      .append("text")
      .attr("x", innerW / 2)
      .attr("y", 36)
      .attr("fill", "#ffffffff")
      .attr("text-anchor", "middle")
      .text("Distance along lap [m]");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -innerH / 2)
      .attr("fill", "#ffffffff")
      .attr("text-anchor", "middle")
      .text("Brake (0–1)");

    // Color scale for different driver-year combinations
    const driverYearKeys = Object.keys(data);
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(["ideal", ...driverYearKeys])
      .range(["#ff0000", ...d3.schemeTableau10]);

    // Draw ideal brake line (same across all)
    const lineIdeal = d3
      .line<BrakingPoint>()
      .x(d => x(d.distance))
      .y(d => y(d.ideal_brake ?? 0))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(firstData)
      .attr("fill", "none")
      .attr("stroke", colorScale("ideal"))
      .attr("stroke-width", 2.5)
      .attr("d", lineIdeal as any);

    // Draw each driver-year line
    const lineDriver = d3
      .line<BrakingPoint>()
      .x(d => x(d.distance))
      .y(d => y(d.driver_brake ?? 0))
      .curve(d3.curveMonotoneX);

    driverYearKeys.forEach(key => {
      g.append("path")
        .datum(data[key])
        .attr("fill", "none")
        .attr("stroke", colorScale(key))
        .attr("stroke-width", 2.5)
        .attr("d", lineDriver as any);
    });

    // Legend
    const legend = svg.append("g").attr("transform", `translate(${margin.left + 10},${10})`);
    
    const legendItems = ["ideal", ...driverYearKeys];
    const itemsPerRow = 3;
    
    legendItems.forEach((key, i) => {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const xOffset = col * 150;
      const yOffset = row * 20;
      
      legend.append("circle")
        .attr("cx", xOffset + 6)
        .attr("cy", yOffset + 6)
        .attr("r", 5)
        .attr("fill", colorScale(key));
      
      const label = key === "ideal" ? "Ideal Lap (fastest)" : key.replace("_", " ");
      legend.append("text")
        .attr("x", xOffset + 18)
        .attr("y", yOffset + 10)
        .text(label)
        .attr("font-size", 11)
        .attr("fill", "white");
    });

    // Tooltip
    const tooltip = d3.select(container).append("div")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("padding", "8px 10px")
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
    
    let tooltipHtml = `<div><strong>Distance:</strong> ${xm.toFixed(1)} m</div>`;
    tooltipHtml += `<div><strong>Ideal Brake:</strong> ${firstData[bisect(firstData, xm)]?.ideal_brake?.toFixed(2) ?? "N/A"}</div>`;
    
    driverYearKeys.forEach(key => {
      const dataset = data[key];
      const i = Math.max(0, Math.min(dataset.length - 1, bisect(dataset, xm)));
      const d = dataset[i];
      if (d) {
        tooltipHtml += `<div><strong>${key}:</strong> ${d.driver_brake.toFixed(2)}</div>`;
      }
    });

    tooltip.style("display", "block")
      .style("left", `${event.clientX + window.scrollX + 12}px`)
      .style("top", `${event.clientY + window.scrollY - 28}px`)
      .html(tooltipHtml);
  }).on("mouseleave", function () {
    tooltip.style("display", "none");
  });
  }, [data, width]);

  return <div ref={containerRef} style={{ width: "100%", position: "relative" }} />;
};