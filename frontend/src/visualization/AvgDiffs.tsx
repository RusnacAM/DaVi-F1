import { useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  type AvgDiffsPoint,
} from "../api/fetchAvgDiffs";


export interface AvgDiffsChartProps {
  data: AvgDiffsPoint[];
}

export const AvgDiffsChart: React.FC<AvgDiffsChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Random dimensions
    const width = 1000;
    const height = 560;
    const margin = { top: 44, right: 200, bottom: 78, left: 72 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // --- Data Processing ---
    const sectorTypes = ["slow", "medium", "fast", "straight"];
    const driverYears = Array.from(new Set(data.map((d) => d.DriverYear)));
    const drivers = Array.from(new Set(data.map((d) => d.DriverYear.split("_")[0])));
    const years = Array.from(new Set(data.map((d) => d.DriverYear.split("_")[1])));

    const grouped = sectorTypes.map((sector) => {
      const row: any = { sector };
      driverYears.forEach((dy) => {
        const found = data.find(
          (r) => r.DriverYear === dy && r.MinisectorLabel === sector
        );
        row[dy] = found ? found.Diff_to_Fastest_sec : 0;
      });
      return row;
    });

    // --- Scales ---
    const x0 = d3
      .scaleBand()
      .domain(sectorTypes)
      .range([0, innerW])
      .padding(0.25);

    const x1 = d3
      .scaleBand()
      .domain(driverYears)
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const yMin = Math.min(0, d3.min(data, (d) => d.Diff_to_Fastest_sec) || 0);
    const yMax = Math.max(0, d3.max(data, (d) => d.Diff_to_Fastest_sec) || 0);

    const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([innerH, 0]);

    const driverColor = d3
      .scaleOrdinal<string>()
      .domain(drivers)
      .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#8c564b"]);

    // --- Defs & Patterns ---
    const defs = svg.append("defs");

    const addPattern = (id: string, color: string, year: string, isLegend = false) => {
      const size = isLegend ? 10 : 8;
      const pat = defs
        .append("pattern")
        .attr("id", id)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", size)
        .attr("height", size);

      // Background
      pat
        .append("rect")
        .attr("width", size)
        .attr("height", size)
        .attr("fill", color);

      // Overlay Texture
      if (Number(year) < 2022) {
        pat
          .append("path")
          .attr("d", `M0 ${size} L${size} 0`)
          .attr("stroke", isLegend ? "white" : "rgba(255,255,255,0.85)")
          .attr("stroke-width", 1.5);
        pat
          .append("path")
          .attr("d", `M-2 ${size + 2} L${size + 2} -2`)
          .attr("stroke", isLegend ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.45)")
          .attr("stroke-width", 1.5);
      } else {
        pat
          .append("circle")
          .attr("cx", size / 2)
          .attr("cy", size / 2)
          .attr("r", isLegend ? 1.8 : 1.2)
          .attr("fill", isLegend ? "white" : "rgba(255,255,255,0.85)");
      }
    };

    // Generate patterns for data
    driverYears.forEach((dy) => {
      const [drv, yr] = dy.split("_");
      addPattern(`pat_${drv}_${yr}`, driverColor(drv), yr);
    });

    // Generate patterns for legend (neutral gray)
    years.forEach((yr) => {
      addPattern(`pat_legend_${yr}`, "#dcdcdc", yr, true);
    });

    // --- Drawing ---
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Sectors
    const sectors = g
      .selectAll("g.sector")
      .data(grouped)
      .enter()
      .append("g")
      .attr("class", "sector")
      .attr("transform", (d: any) => `translate(${x0(d.sector)},0)`);

    // Bars
    sectors
      .selectAll("rect")
      .data((d: any) => driverYears.map((dy) => ({ key: dy, value: d[dy] })))
      .enter()
      .append("rect")
      .attr("x", (d) => x1(d.key)!)
      .attr("width", x1.bandwidth())
      .attr("y", (d) => (d.value >= 0 ? y(d.value) : y(0)))
      .attr("height", (d) => Math.abs(y(d.value) - y(0)))
      .attr("fill", (d) => {
        const [drv, yr] = d.key.split("_");
        return `url(#pat_${drv}_${yr})`;
      })
      .attr("stroke", "none");

    // --- Axes ---
    g.append("g")
      .attr("transform", `translate(0,${y(0)})`)
      .call(d3.axisBottom(x0));

    g.append("g").call(d3.axisLeft(y).ticks(6));

    // Labels
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 48)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text("Sector Type");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -52)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text("Average time loss [s]");

    // --- Legend ---
    const legendX = width - margin.right + 20;
    const legend = svg
      .append("g")
      .attr("transform", `translate(${legendX},${margin.top})`);

    // Driver Colors
    legend
      .append("text")
      .text("Driver (color)")
      .attr("font-weight", "700")
      .attr("font-size", 12);

    drivers.forEach((drv, i) => {
      const y0 = 14 + i * 26;
      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", y0)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", driverColor(drv));
      legend
        .append("text")
        .attr("x", 26)
        .attr("y", y0 + 13)
        .text(drv)
        .attr("font-size", 13);
    });

    // Year Textures
    const yearLabelY = 14 + drivers.length * 26 + 8;
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", yearLabelY)
      .text("Year (texture)")
      .attr("font-weight", "700")
      .attr("font-size", 12);

    years.forEach((yr, i) => {
      const y0 = yearLabelY + 26 + i * 26;
      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", y0)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", `url(#pat_legend_${yr})`)
        .attr("stroke", "#666");
      legend
        .append("text")
        .attr("x", 26)
        .attr("y", y0 + 13)
        .text(yr)
        .attr("font-size", 13);
    });

  }, [data]);

  return <svg ref={svgRef} width={1000} height={560}></svg>;
};
