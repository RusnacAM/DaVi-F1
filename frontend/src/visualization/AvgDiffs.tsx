import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { type AvgDiffsPoint } from "../api/fetchAvgDiffs";
import { getDriverYearColor } from "../utils/configureFilterData";

// Set Visualization Dimensions and Margins
const WIDTH = 700;
const HEIGHT = 350;
const MARGIN = { top: 50, right: 100, bottom: 50, left: 70 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

export interface AvgDiffsChartProps {
  data: AvgDiffsPoint[];
  driverColorMap: Record<string, string>;
  sessionYears: string[];
}

export const AvgDiffsChart: React.FC<AvgDiffsChartProps> = ({
  data,
  driverColorMap,
  sessionYears,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 1. Tooltip Setup
    // Remove old tooltips to prevent duplicates
    d3.select(svgRef.current?.parentElement)
      .selectAll(".avgdiffs-tooltip")
      .remove();

    const tooltip = d3
      .select(svgRef.current?.parentElement)
      .append("div")
      .attr("class", "avgdiffs-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "rgba(0,0,0,0.78)")
      .style("color", "#fff")
      .style("padding", "4px 6px")
      .style("font-size", "11px")
      .style("line-height", "1.1")
      .style("border-radius", "4px")
      .style("opacity", "0")
      .style("z-index", "1000");

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // --- 2. Data Preparation & Filtering ---
    const sectors = ["Slow", "Medium", "Fast", "Straight"];
    const allDriverYears = Array.from(new Set(data.map((d) => d.DriverYear)));

    const fastestDriver = data[0]?.FastestOverallDriver;
    const fastestYear = data[0]?.FastestOverallYear;

    const fastestDriverYear =
      fastestDriver && fastestYear ? `${fastestDriver}_${fastestYear}` : "";

    const activeDriverYears = allDriverYears
      .filter((dy) => dy !== fastestDriverYear)
      .sort();

    // Group Data
    const groupedData = sectors.map((sector) => {
      const row: any = { sector };
      activeDriverYears.forEach((dy) => {
        const found = data.find(
          (d) =>
            d.DriverYear === dy &&
            d.MinisectorLabel.toLowerCase() === sector.toLowerCase()
        );
        row[dy] = found ? Number(found.Diff_to_Fastest_sec) : 0;
      });
      return row;
    });

    // --- 3. Scales ---
    const x0 = d3.scaleBand().domain(sectors).range([0, INNER_W]).padding(0.2);

    const x1 = d3
      .scaleBand()
      .domain(activeDriverYears)
      .range([0, x0.bandwidth()])
      .padding(0.1);

    const allValues: number[] = groupedData.flatMap((row) =>
      activeDriverYears.map((dy) => Number(row[dy] ?? 0))
    );

    let yMin = d3.min(allValues) ?? 0;
    let yMax = d3.max(allValues) ?? 0;
    if (yMin > 0) yMin = 0;
    if (yMax < 0) yMax = 0;

    const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([INNER_H, 0]);

    const colorScale = (fastest: string) =>
      getDriverYearColor(fastest, driverColorMap, sessionYears);

    // Baseline Y is the pixel position of the value 0
    const baselineY = y(0);

    // --- 4. Drawing Bars ---
    const sectorGroup = g
      .selectAll(".sector-group")
      .data(groupedData)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${x0(d.sector)},0)`);

    sectorGroup
      .selectAll("rect")
      .data((d) => activeDriverYears.map((dy) => ({ key: dy, value: d[dy] })))
      .enter()
      .append("rect")
      .attr("x", (d) => x1(d.key)!)
      // Logic: If value > 0, rect starts at y(value) and goes down to baselineY.
      // If value < 0, rect starts at baselineY and goes down to y(value).
      // Math.min handles the "start y" correctly for both cases relative to SVG coords.
      .attr("y", (d) => Math.min(y(d.value), baselineY))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => Math.abs(y(d.value) - baselineY))
      .attr("fill", (d) => colorScale(d.key))
      .attr("fill-opacity", 1)
      .attr("stroke", "none")
      // Tooltip Interactions
      .on("mouseenter", function (event: any, d: any) {
        const [drv, yr] = d.key.split("_");
        tooltip
          .html(
            `<div style="font-weight:600;margin-bottom:2px">${drv} ${yr}</div><div style="font-size:11px">${Number(
              d.value
            ).toFixed(3)} s</div>`
          )
          .style("opacity", "1");
      })
      .on("mousemove", function (event: any) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 8 + "px");
      })
      .on("mouseleave", function () {
        tooltip.style("opacity", "0");
      });

    // --- 5. Axes & Labels ---

    // X Axis: Positioned at INNER_H (Bottom of chart area)
    const xAxisG = g.append("g")
      .attr("transform", `translate(0,${INNER_H})`)
      .call(d3.axisBottom(x0).tickSize(0)); // tickSize(0) hides ticks if you just want labels
    
    // Remove the horizontal line (domain) from the x-axis so it doesn't double up with the chart border
    xAxisG.select(".domain").remove();

    xAxisG.selectAll("text")
      .attr("dy", "1em") // Standard spacing
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("text-transform", "capitalize")
      .style("fill", "#fff");

    // Zero Line: Drawn manually at y(0) to handle negative bars
    g.append("line")
      .attr("x1", 0)
      .attr("x2", INNER_W)
      .attr("y1", baselineY)
      .attr("y2", baselineY)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5);

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#fff");

    // Y Label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -INNER_H / 2)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .text("Time loss (s)");

    // Title
    const titleText = fastestDriverYear
      ? [
          `Fastest driver: ${fastestDriverYear.split("_")[0]} (${fastestDriverYear.split("_")[1]})`,
          "Average time loss to fastest driver",
        ]
      : ["Avg Time Loss to Fastest"];

    const title = svg
      .append("text")
      .attr("x", MARGIN.left + INNER_W / 2)
      .attr("y", MARGIN.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .style("fill", "#fff");

    titleText.forEach((line, i) => {
      title
        .append("tspan")
        .attr("x", MARGIN.left + INNER_W / 2)
        .attr("dy", i === 0 ? 0 : 18)
        .text(line);
    });

    // Cleanup function when component unmounts
    return () => {
      tooltip.remove();
    };
  }, [data, driverColorMap, sessionYears]);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        style={{ maxWidth: "100%", height: "auto" }}
      ></svg>
    </div>
  );
};