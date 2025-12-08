import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { BrakingPoint } from "../api/fetchBrakingComparison";

type Props = {
  data: Record<string, BrakingPoint[]>;
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
    const driverYearKeys = Object.keys(data);
    const rowHeight = 40;
    const height = 100 + (driverYearKeys.length + 1) * rowHeight; // +1 for ideal
    const margin = { top: 60, right: 40, bottom: 50, left: 120 };
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

    const firstKey = Object.keys(data)[0];
    const firstData = data[firstKey];
    
    const x = d3
      .scaleLinear()
      .domain(d3.extent(firstData, (d) => d.distance) as [number, number])
      .range([0, innerW]);

    const allKeys = ["ideal", ...driverYearKeys];
    const y = d3
      .scaleBand()
      .domain(allKeys)
      .range([0, innerH])
      .padding(0.2);

    // Color scale
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(allKeys)
      .range(["#ff0000", ...d3.schemeTableau10]);

    // Draw horizontal grid lines
    allKeys.forEach(key => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(key)! + y.bandwidth() / 2)
        .attr("y2", y(key)! + y.bandwidth() / 2)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);
    });

    // Helper function to find braking segments
    const findBrakingSegments = (points: BrakingPoint[], brakeKey: "ideal_brake" | "driver_brake") => {
      const segments: Array<{ start: number; end: number }> = [];
      let inSegment = false;
      let segmentStart = 0;

      for (let i = 0; i < points.length; i++) {
        const isBraking = points[i][brakeKey] > 0;
        
        if (isBraking && !inSegment) {
          // Start new segment
          segmentStart = points[i].distance;
          inSegment = true;
        } else if (!isBraking && inSegment) {
          // End segment
          segments.push({ start: segmentStart, end: points[i - 1].distance });
          inSegment = false;
        }
      }
      
      // Close last segment if still braking at end
      if (inSegment) {
        segments.push({ start: segmentStart, end: points[points.length - 1].distance });
      }
      
      return segments;
    };

    // Draw ideal brake segments
    const idealSegments = findBrakingSegments(firstData, "ideal_brake");
    idealSegments.forEach(segment => {
      g.append("rect")
        .attr("x", x(segment.start))
        .attr("y", y("ideal")!)
        .attr("width", Math.max(2, x(segment.end) - x(segment.start)))
        .attr("height", y.bandwidth())
        .attr("fill", colorScale("ideal"))
        .attr("opacity", 0.8);
    });

    // Draw each driver's brake segments
    driverYearKeys.forEach(key => {
      const segments = findBrakingSegments(data[key], "driver_brake");
      
      segments.forEach(segment => {
        g.append("rect")
          .attr("x", x(segment.start))
          .attr("y", y(key)!)
          .attr("width", Math.max(2, x(segment.end) - x(segment.start)))
          .attr("height", y.bandwidth())
          .attr("fill", colorScale(key))
          .attr("opacity", 0.8);
      });
    });

    // X-axis (bottom)
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(10))
      .selectAll("text")
      .attr("fill", "white");

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 40)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .text("Distance along lap [m]");

    // Y-axis (left) - driver labels
    g.append("g")
      .call(d3.axisLeft(y).tickFormat(d => d === "ideal" ? "Ideal Lap" : d.replace("_", " ")))
      .selectAll("text")
      .attr("fill", "white")
      .attr("font-size", 11);

    // Legend (optional, since labels are on y-axis)
    const legend = svg.append("g").attr("transform", `translate(${margin.left + 10},${10})`);
    legend.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .text("Braking Periods")
      .attr("font-size", 14)
      .attr("fill", "white")
      .attr("font-weight", "bold");

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
      
      // Check ideal
      const idealIdx = bisect(firstData, xm);
      const idealPoint = firstData[idealIdx];
      if (idealPoint) {
        tooltipHtml += `<div><strong>Ideal:</strong> ${idealPoint.ideal_brake >= 0.5 ? "Braking" : "Not braking"}</div>`;
      }
      
      // Check each driver
      driverYearKeys.forEach(key => {
        const dataset = data[key];
        const i = Math.max(0, Math.min(dataset.length - 1, bisect(dataset, xm)));
        const d = dataset[i];
        if (d) {
          tooltipHtml += `<div><strong>${key}:</strong> ${d.driver_brake >= 0.5 ? "Braking" : "Not braking"}</div>`;
        }
      });

      tooltip.style("display", "block")
        .style("left", `${event.clientX + 12}px`)
        .style("top", `${event.clientY - 28}px`)
        .html(tooltipHtml);
    }).on("mouseleave", function () {
      tooltip.style("display", "none");
    });
  }, [data, width]);

  return <div ref={containerRef} style={{ width: "100%", position: "relative" }} />;
};