import { useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  type TrackDominancePoint,
} from "../api/fetchTrackDominance";

export interface TrackDominanceProps {
  data: TrackDominancePoint[];
}

export const TrackDominance: React.FC<TrackDominanceProps>  = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
    if (!data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 700;
    const height = 500;
    const margin = 10;

    const xExtent = d3.extent(data, (d) => d.x) as [number, number];
    const yExtent = d3.extent(data, (d) => d.y) as [number, number];

    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([margin, width - margin]);
    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([height - margin, margin]);

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain([...new Set(data.map((d) => d.fastest))])
      .range(d3.schemeTableau10);

    const sectors = d3.group(data, (d) => d.minisector);

    const line = d3
      .line<TrackDominancePoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    for (const [, points] of sectors) {
      svg
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", colorScale(points[0].fastest)!)
        .attr("stroke-width", 8)
        .attr("d", line);

      const midIndex = Math.floor(points.length / 2);
      const midPoint = points[midIndex];

      // Add minisector label
      svg
        .append("text")
        .attr("x", xScale(midPoint.x))
        .attr("y", yScale(midPoint.y))
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("font-size", 10)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .attr("paint-order", "stroke")
        .text(midPoint.minisector);
    }

    // --- Legend ---
    const drivers = Array.from(new Set(data.map((d) => d.fastest)));
    const legend = svg
      .selectAll(".legend")
      .data(drivers)
      .enter()
      .append("g")
      .attr("transform", (_, i) => `translate(0, ${30 + i * 20})`);

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (d) => colorScale(d)!);

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("font-size", 12)
      .attr("fill", "white")
      .text((d) => d);
  }, [data]);

  return <svg ref={svgRef} width={700} height={500}></svg>;
};
