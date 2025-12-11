import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { BrakingPoint } from "../api/fetchBrakingComparison";
import { getDriverYearColor } from "../utils/configureFilterData";

type Props = {
  data: Record<string, BrakingPoint[]>;
  driverColorMap: Record<string, string>;
  sessionYears: string[];
  onHeightChange?: (h: number) => void;
};

export const BrakingComparison: React.FC<Props> = ({
  data,
  driverColorMap,
  sessionYears,
  onHeightChange,
}) => {
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
    if (!data || Object.keys(data).length === 0 || !containerRef.current)
      return;

    const container = containerRef.current;
    const driverYearKeys = Object.keys(data);
    const rowHeight = 40;

    // Get first dataset to find which driver/year combination is the ideal
    const firstKey = driverYearKeys[0];
    const firstData = data[firstKey];
    
    // Find which driver_year key corresponds to the ideal lap
    // by checking if any driver's brake data matches the ideal_brake
    let idealKey: string | null = null;
    for (const key of driverYearKeys) {
      const dataset = data[key];
      // Check if this dataset's brake data matches the ideal (sample a few points)
      const sampleSize = Math.min(10, dataset.length);
      let matches = 0;
      for (let i = 0; i < sampleSize; i++) {
        const idx = Math.floor((i * dataset.length) / sampleSize);
        if (dataset[idx].ideal_brake === dataset[idx].driver_brake) {
          matches++;
        }
      }
      // If most sampled points match, this is likely the ideal lap
      if (matches > sampleSize * 0.8) {
        idealKey = key;
        break;
      }
    }

    // Determine if we should show ideal separately
    const showIdealSeparately = idealKey === null;
    const allKeys = showIdealSeparately ? ["ideal", ...driverYearKeys] : driverYearKeys;
    
    const numRows = allKeys.length;
    const chartHeight = numRows * rowHeight;
    const margin = { top: 60, right: 5, bottom: 50, left: 60 };
    const MIN_HEIGHT = 400;
    const rawHeight = chartHeight + margin.top + margin.bottom;
    const finalHeight = Math.max(rawHeight, MIN_HEIGHT);

    // Compute vertical offset if min height is used (anchor chart to bottom)
    const extraSpace = finalHeight - rawHeight;
    const verticalOffset = extraSpace;

    const innerW = width - margin.left - margin.right;

    onHeightChange?.(finalHeight);

    d3.select(container).selectAll("svg").remove();
    d3.select(container).selectAll("div").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", finalHeight);

    const g = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left},${margin.top + verticalOffset})`
      );

    const x = d3
      .scaleLinear()
      .domain(d3.extent(firstData, (d) => d.distance) as [number, number])
      .range([0, innerW]);

    // Use fixed chartHeight for y-scale to keep bars same thickness
    const y = d3.scaleBand().domain(allKeys).range([0, chartHeight]).padding(0.2);

    // Color scale
    const colorScale = (key: string) => {
      if (key === "ideal") return "#c27bff";
      const [year, code] = key.split("_");
      const normalized = `${code}_${year}`;
      return getDriverYearColor(normalized, driverColorMap, sessionYears);
    };

    // Draw horizontal grid lines
    allKeys.forEach((key) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(key)! + y.bandwidth() / 2)
        .attr("y2", y(key)! + y.bandwidth() / 2)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);
    });

    // Helper function to find braking segments
    const findBrakingSegments = (
      points: BrakingPoint[],
      brakeKey: "ideal_brake" | "driver_brake"
    ) => {
      const segments: Array<{ start: number; end: number }> = [];
      let inSegment = false;
      let segmentStart = 0;

      for (let i = 0; i < points.length; i++) {
        const isBraking = points[i][brakeKey] > 0;

        if (isBraking && !inSegment) {
          segmentStart = points[i].distance;
          inSegment = true;
        } else if (!isBraking && inSegment) {
          segments.push({ start: segmentStart, end: points[i - 1].distance });
          inSegment = false;
        }
      }

      if (inSegment) {
        segments.push({
          start: segmentStart,
          end: points[points.length - 1].distance,
        });
      }

      return segments;
    };

    // Draw ideal brake segments only if showing separately
    if (showIdealSeparately) {
      const idealSegments = findBrakingSegments(firstData, "ideal_brake");
      idealSegments.forEach((segment) => {
        g.append("rect")
          .attr("x", x(segment.start))
          .attr("y", y("ideal")!)
          .attr("width", Math.max(2, x(segment.end) - x(segment.start)))
          .attr("height", y.bandwidth())
          .attr("fill", colorScale("ideal"))
          .attr("opacity", 0.8);
      });
    }

    // Draw each driver's brake segments
    driverYearKeys.forEach((key) => {
      const segments = findBrakingSegments(data[key], "driver_brake");
      segments.forEach((segment) => {
        g.append("rect")
          .attr("x", x(segment.start))
          .attr("y", y(key)!)
          .attr("width", Math.max(2, x(segment.end) - x(segment.start)))
          .attr("height", y.bandwidth())
          .attr("fill", colorScale(key))
          .attr("opacity", 0.8);
      });
    });

    // X-axis at bottom of chartHeight (bars), so bottom-anchored
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(10))
      .selectAll("text")
      .attr("fill", "white");

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", chartHeight + 40)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Distance along lap [m]");

    // Y-axis
    g.append("g")
      .call(
        d3.axisLeft(y).tickFormat((d) => {
          if (d === "ideal") return "Ideal Lap (fastest)";
          // If this is the ideal key, mark it
          if (d === idealKey) return `${d.replace("_", " ")}`;
          return d.replace("_", " ");
        })
      )
      .selectAll("text")
      .attr("fill", "white")
      .attr("font-size", 11);

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
      .attr("height", chartHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    const bisect = d3.bisector<BrakingPoint, number>((d) => d.distance).left;

    overlay.on("mousemove", function (event) {
      const pointer = d3.pointer(event);
      const xm = x.invert(pointer[0]);

      let tooltipHtml = `<div><strong>Distance:</strong> ${xm.toFixed(1)} m</div>`;

      // Show all drivers' braking status
      driverYearKeys.forEach(key => {
        const dataset = data[key];
        const i = Math.max(0, Math.min(dataset.length - 1, bisect(dataset, xm)));
        const d = dataset[i];
        if (d) {
          const label = key === idealKey ? `${key} (fastest)` : key;
          tooltipHtml += `<div><strong>${label}:</strong> ${
            d.driver_brake >= 0.5 ? "Braking" : "Not braking"
          }</div>`;
        }
      });

      tooltip.style("display", "block")
        .style("left", `${event.clientX + 12}px`)
        .style("top", `${event.clientY - 28}px`)
        .html(tooltipHtml);
    }).on("mouseleave", function () {
      tooltip.style("display", "none");
    });
  }, [data, width, sessionYears, driverColorMap, onHeightChange]);

  return <div ref={containerRef} style={{ width: "100%", position: "relative" }} />;
};