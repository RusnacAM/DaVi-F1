import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { type TrackDominancePoint } from "../api/fetchTrackDominance";
import { driverCode, getDriverYearColor } from "../utils/configureFilterData";

export interface TrackDominanceProps {
  data: TrackDominancePoint[];
  driverNames: string[];
  sessionYears: string[];
  driverColorMap: Record<string, string>;
}

export const TrackDominance: React.FC<TrackDominanceProps> = ({
  data,
  driverNames,
  sessionYears,
  driverColorMap,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const codeToDriver = Object.fromEntries(
    Object.entries(driverCode).map(([name, code]) => [code, name])
  );
  const driverCodes = driverNames.map((d) => driverCode[d]);
  const fastestList = driverCodes.flatMap((code) =>
    sessionYears.map((year) => `${code}_${year}`)
  );

  useEffect(() => {
    if (!data) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const legendGroup = svg.append("g").attr("class", "legend-group");
    const trackGroup = svg
      .append("g")
      .attr("class", "track-group")
      .attr("transform", "translate(100, 0)");

    //  --- Track ---
    const width = 500;
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

    const colorScale = (fastest: string) => getDriverYearColor(fastest, driverColorMap, sessionYears);

    const startPoint = data[0];
    const sectors = d3.group(data, (d) => d.minisector);

    const line = d3
      .line<TrackDominancePoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveCatmullRom.alpha(0.7));

    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("padding", "4px 8px")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "white")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("transition", "opacity 120ms ease");

    for (const [, points] of sectors) {
      trackGroup
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", colorScale(points[0].fastest))
        .attr("stroke-width", 8)
        .attr("d", line)
        .on("mouseover", function () {
          d3.select(this).attr("stroke-width", 14);
        })
        .on("mousemove", function (event) {
          tooltip
            .html(
              `
              Minisector: ${points[0].minisector}<br>
              Driver: ${codeToDriver[points[0].driver]}<br>
              Year: ${points[0].year}
              `
            )
            .style("opacity", 1)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke-width", 8);
          tooltip.style("opacity", 0);
        });
    }

    if (startPoint) {
      trackGroup
        .append<SVGImageElement>("image")
        .attr("href", "public/images/start_track.png")
        .attr("x", xScale(startPoint.x) - 8)
        .attr("y", yScale(startPoint.y) - 8)
        .attr("width", 21)
        .attr("height", 21);
    }

    // --- Legend ---
    const legend = legendGroup
      .selectAll(".legend")
      .data(fastestList)
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

  return <svg ref={svgRef} width={675} height={500}></svg>;
};
