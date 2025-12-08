import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { type LapGapEvolutionPoint } from "../api/fetchLapGapEvolution";
import { getDriverYearColor } from "../utils/configureFilterData";

export interface LapGapEvolutionProps {
    data: LapGapEvolutionPoint[];
    sessionYears: string[];
    driverColorMap: Record<string, string>;
}

export const LapGapEvolution: React.FC<LapGapEvolutionProps> = ({
    data,
    sessionYears,
    driverColorMap,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 700;
    const height = 350;
    const margin = { top: 40, right: 100, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

        const drivers = Object.keys(data);

        // Flatten all non-reference points for scales
        const allPoints = Object.entries(data)
            .flatMap(([_, points]) => points);

        // Title
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(`Lap Gap Evolution to fastest driver`);

    // Scales
    const xExtent = d3.extent(allPoints, (d) => d.x) as [number, number];
    const yExtent = d3.extent(allPoints, (d) => d.y) as [number, number];

        const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain([yExtent[0], yExtent[1]]).range([innerHeight, 0]);

        const colorScale = (fastest: string) => getDriverYearColor(fastest, driverColorMap, sessionYears);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .attr("x", innerWidth / 2)
      .attr("y", 40)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .text("Track Distance (m)");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -45)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .text("Time Difference (s)");

    // Draw reference driver as horizontal line y=0
    g.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(0))
      .attr("x2", innerWidth)
      .attr("y2", yScale(0))
      .attr("stroke", "white")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 2);

    // Line generator
    const line = d3
      .line<LapGapEvolutionPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

        // Draw non-reference driver-year lines
        drivers.forEach((driverKey, i) => {
            g.append("path")
                .datum(data[driverKey])
                .attr("stroke", () => {
                    const key = driverKey.replace(" ", "_");
                    return colorScale(key);
                })
                .attr("fill", "none")
                .attr("stroke-width", 2)
                .attr("d", line);
        });
    }, [data]);

  return <svg ref={svgRef} width={700} height={350}></svg>;
};
