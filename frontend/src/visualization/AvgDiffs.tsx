import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { type AvgDiffsPoint } from "../api/fetchAvgDiffs";


// Set Visualization Dimensions and Margins
const WIDTH = 650;
const HEIGHT = 400;
const MARGIN = { top: 50, right: 100, bottom: 50, left: 70 }; // Increased Right margin for Legend
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

// Set colorscheme
const COLORS = d3.schemeTableau10;

export interface AvgDiffsChartProps {
  data: AvgDiffsPoint[];
}

export const AvgDiffsChart: React.FC<AvgDiffsChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // remove any leftover tooltip from previous renders and create a tiny tooltip
    d3.select(svgRef.current?.parentElement).selectAll(".avgdiffs-tooltip").remove();
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

    // --- 1. Data Preparation & Filtering ---
    const sectors = ["Slow", "Medium", "Fast", "Straight"];
    const allDriverYears = Array.from(new Set(data.map((d) => d.DriverYear)));

    // A. Identify the Fastest Overall (Baseline) to remove
    // We sum up the time diffs for each DriverYear. The one with the lowest sum is the fastest.
    const sums = allDriverYears.map((dy) => {
      const totalDiff = data
        .filter((d) => d.DriverYear === dy)
        .reduce((sum, curr) => sum + curr.Diff_to_Fastest_sec, 0);
      return { dy, totalDiff };
    });
    
    // Sort ascending (lowest diff first) and pick the first one
    const fastestEntry = sums.sort((a, b) => a.totalDiff - b.totalDiff)[0];
    const fastestDriverYear = fastestEntry ? fastestEntry.dy : "";

    // B. Create the Filtered List (Exclude the fastest)
    const activeDriverYears = allDriverYears
      .filter((dy) => dy !== fastestDriverYear)
      .sort();

    // C. Extract Drivers and Years from the FILTERED list
    const activeDrivers = Array.from(new Set(activeDriverYears.map((dy) => dy.split("_")[0]))).sort();
    //const activeYears = Array.from(new Set(activeDriverYears.map((dy) => dy.split("_")[1]))).sort();

    // D. Group Data
    const groupedData = sectors.map((sector) => {
      const row: any = { sector };
      activeDriverYears.forEach((dy) => {
        // Case-insensitive check for label
        const found = data.find(
          (d) => 
            d.DriverYear === dy && 
            d.MinisectorLabel.toLowerCase() === sector.toLowerCase()
        );
        row[dy] = found ? Number(found.Diff_to_Fastest_sec) : 0;
      });
      return row;
    });

    // --- 2. Scales ---
    const x0 = d3.scaleBand().domain(sectors).range([0, INNER_W]).padding(0.2);

    // x1 Domain is strictly the active (filtered) list. 
    // This ensures bars are centered within the x0 band.
    const x1 = d3
      .scaleBand()
      .domain(activeDriverYears)
      .range([0, x0.bandwidth()])
      .padding(0.1);

    // compute min/max from the actual plotted values so negatives are handled
    const allValues: number[] = groupedData.flatMap((row) =>
      activeDriverYears.map((dy) => Number(row[dy] ?? 0))
    );
    let yMin = d3.min(allValues) ?? 0;
    let yMax = d3.max(allValues) ?? 0;
    // ensure zero is included so baseline is visible
    if (yMin > 0) yMin = 0;
    if (yMax < 0) yMax = 0;

    const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([INNER_H, 0]);

    const colorScale = d3.scaleOrdinal<string>().domain(activeDrivers).range(COLORS);
    
    // Map each driver to its sorted list of years (strings)
    const yearsByDriver: Record<string, string[]> = Object.fromEntries(
      activeDrivers.map((drv) => {
        const yrs = activeDriverYears
          .filter((dy) => dy.startsWith(drv + "_"))
          .map((dy) => dy.split("_")[1])
          .sort();
        return [drv, yrs];
      })
    );
    
    // determine baseline Y (clamped to chart area)
    const baselineY = Math.max(0, Math.min(INNER_H, y(0)));

    // --- 3. Drawing Bars ---
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
      // position & height relative to baseline so negative values go below x-axis
      .attr("y", (d) => Math.min(y(d.value), baselineY))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => Math.abs(y(d.value) - baselineY))
      .attr("fill", (d) => {
        const [drv, yr] = d.key.split("_");
        // base color per driver from the categorical scale
        const baseColor = colorScale(drv) as string;

        // convert to HSL and vary saturation & lightness by year index
        const h = d3.hsl(baseColor);
        const years = yearsByDriver[drv] ?? [yr];
        const idx = Math.max(0, years.indexOf(yr));
        const t = years.length > 1 ? idx / (years.length - 1) : 0.5; // 0..1 across years
        // saturation: from 0.6 -> 1.0, lightness: from 0.35 -> 0.7 (t controls interpolation)
        h.s = Math.max(0, Math.min(1, 0.8 + 0.2 * t));
        h.l = Math.max(0, Math.min(1, 0.5 + 0.2 * t));
        return h.toString();
       })


      // tiny tooltip interactions
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
        // position tooltip next to cursor with slight offset
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 8 + "px");
      })
      .on("mouseleave", function () {
        tooltip.style("opacity", "0");
      })
      // Removed variable opacity: always full opacity
      .attr("fill-opacity", 1)
      .attr("stroke", "none");

    // --- 4. Axes & Labels ---
    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${baselineY})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      // shift tick labels further away from the axis when there are negative values
      .attr("dy", yMin < 0 ? "4em" : "1em")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("text-transform", "capitalize") // Capitalize sector names
      .style("fill", "#fff"); // labels white

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#fff"); // labels white

    // Y Label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -INNER_H / 2)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .text("Time loss (s)");

    // --- 5. Legends ---
    const legend = svg
      .append("g")
      .attr("transform", `translate(${INNER_W + 20}, ${MARGIN.top})`);

    // -> Driver Legend (Colors)
    legend.append("text").text("Drivers").style("font-weight", "bold").style("fill", "#fff");
    
    activeDrivers.forEach((drv, i) => {
      const yPos = 25 + i * 20;
      legend.append("rect")
        .attr("y", yPos).attr("width", 15).attr("height", 15)
        .attr("fill", colorScale(drv));
      legend.append("text")
        .attr("x", 20).attr("y", yPos + 12)
        .text(drv).style("font-size", "12px").style("fill", "#fff");
    });

    /* -> Year Legend (no opacity encoding anymore)
    if (activeYears.length > 0) {
        const yearStart = 25 + activeDrivers.length * 20 + 20;
        legend.append("text")
            .attr("y", yearStart)
            .text("Years")
            .style("font-weight", "bold")
            .style("fill", "#fff");

        activeYears.forEach((yr, i) => {
            const yPos = yearStart + 25 + i * 20;
            
            // Draw a neutral gray box (full opacity)
            legend.append("rect")
                .attr("y", yPos).attr("width", 15).attr("height", 15)
                .attr("fill", "#666")
                .attr("fill-opacity", 1);
                
            legend.append("text")
                .attr("x", 20).attr("y", yPos + 12)
                .text(yr).style("font-size", "12px").style("fill", "#fff");
        });
    } */

    // Title: centered at the top of the SVG, includes baseline info if available
    const titleText = fastestDriverYear
      ? `Average time loss to fastest driver: ${fastestDriverYear.split("_")[0]} (${fastestDriverYear.split("_")[1]})`
      : "Avg Time Loss to Fastest";

    svg.append("text")
      .attr("x", MARGIN.left + INNER_W / 2)
      .attr("y", MARGIN.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .style("fill", "#fff")
      .text(titleText);

  }, [data]);

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