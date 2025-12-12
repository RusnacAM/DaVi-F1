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

  // Resize listener
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

    // --- FIXED IDEAL-LAP DETECTION ---
    // A dataset is ideal if it contains ideal_brake values with a meaningful sum
    let idealKey: string | null = null;

    for (const key of driverYearKeys) {
      const arr = data[key];
      const sumIdeal = d3.sum(arr, (d) => d.ideal_brake ?? 0);
      if (sumIdeal > 0) {
        idealKey = key;
        break;
      }
    }

    // If no dataset contains ideal_brake ⇒ display ideal separately
    const showIdealSeparately = idealKey === null;

    const allKeys = showIdealSeparately
      ? ["ideal", ...driverYearKeys]
      : driverYearKeys;

    const firstData = data[driverYearKeys[0]];
    const margin = { top: 60, right: 5, bottom: 50, left: 60 };

    const chartHeight = allKeys.length * rowHeight;
    const MIN_HEIGHT = 400;
    const rawHeight = chartHeight + margin.top + margin.bottom;
    const finalHeight = Math.max(rawHeight, MIN_HEIGHT);

    const extraSpace = finalHeight - rawHeight;
    const verticalOffset = extraSpace;

    const innerW = width - margin.left - margin.right;
    onHeightChange?.(finalHeight);

    // Clear existing
    d3.select(container).selectAll("svg").remove();
    d3.select(container).selectAll("div").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", finalHeight);
    
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 3)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Braking Comparison");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top + verticalOffset})`);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(firstData, (d) => d.distance) as [number, number])
      .range([0, innerW]);

    const y = d3.scaleBand().domain(allKeys).range([0, chartHeight]).padding(0.2);

    // -- Color scale --
    const colorScale = (key: string) => {
      if (key === "ideal") return "#c27bff";
      const [year, code] = key.split("_");
      return getDriverYearColor(`${code}_${year}`, driverColorMap, sessionYears);
    };

    // Horizontal grid lines
    allKeys.forEach((key) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(key)! + y.bandwidth() / 2)
        .attr("y2", y(key)! + y.bandwidth() / 2)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);
    });

    const findBrakingSegments = (
      pts: BrakingPoint[],
      key: "ideal_brake" | "driver_brake"
    ) => {
      const out: Array<{ start: number; end: number }> = [];
      let inSeg = false;
      let start = 0;

      for (let i = 0; i < pts.length; i++) {
        const braking = pts[i][key] > 0;
        if (braking && !inSeg) {
          start = pts[i].distance;
          inSeg = true;
        } else if (!braking && inSeg) {
          out.push({ start, end: pts[i - 1].distance });
          inSeg = false;
        }
      }
      if (inSeg) out.push({ start, end: pts[pts.length - 1].distance });
      return out;
    };

    // Draw ideal if separate
    if (showIdealSeparately) {
      const idealSegments = findBrakingSegments(firstData, "ideal_brake");
      idealSegments.forEach((seg) => {
        g.append("rect")
          .attr("x", x(seg.start))
          .attr("y", y("ideal")!)
          .attr("width", Math.max(2, x(seg.end) - x(seg.start)))
          .attr("height", y.bandwidth())
          .attr("fill", "#c27bff")
          .attr("opacity", 0.8);
      });
    }

    // Draw driver laps
    driverYearKeys.forEach((key) => {
      const segments = findBrakingSegments(data[key], "driver_brake");
      segments.forEach((seg) => {
        g.append("rect")
          .attr("x", x(seg.start))
          .attr("y", y(key)!)
          .attr("width", Math.max(2, x(seg.end) - x(seg.start)))
          .attr("height", y.bandwidth())
          .attr("fill", colorScale(key))
          .attr("opacity", 0.8);
      });
    });

    // X-axis
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
      .text("Distance along lap (m)");

    // Y-axis
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .tickFormat(d =>
            d === "ideal"
              ? "Fastest"
              : `${d.split("_")[1]} ${d.split("_")[0].replace("20","")}`
          )
      )
      .selectAll("text")
      .attr("fill", "white")
      .attr("font-size", 11);

    // Tooltip
    const tooltip = d3
      .select(container)
      .append("div")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("padding", "8px 10px")
      .style("background", "rgba(255,255,255,0.95)")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("color", "black")
      .style("display", "none");

    const overlay = g
      .append("rect")
      .attr("width", innerW)
      .attr("height", chartHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    const bisect = d3.bisector<BrakingPoint, number>((d) => d.distance).left;

    overlay
      .on("mousemove", function (event) {
        const [xPos] = d3.pointer(event);
        const dist = x.invert(xPos);
        let html = `<div><strong>Distance:</strong> ${dist.toFixed(1)} m</div>`;

        driverYearKeys.forEach((key) => {
          const arr = data[key];
          const i = Math.max(0, Math.min(arr.length - 1, bisect(arr, dist)));
          const d = arr[i];
          html += `<div><strong>${`${key.split("_")[1]} ${key.split("_")[0].replace("20","")}`}:</strong> ${
            d.driver_brake >= 0.5 ? "Braking" : "Not braking"
          }</div>`;
        });

        tooltip
          .style("display", "block")
          .style("left", event.clientX + 12 + "px")
          .style("top", event.clientY - 28 + "px")
          .html(html);
      })
      .on("mouseleave", () => tooltip.style("display", "none"));
  }, [data, width, sessionYears, driverColorMap, onHeightChange]);

  return <div ref={containerRef} style={{ width: "100%", position: "relative" }} />;
};
