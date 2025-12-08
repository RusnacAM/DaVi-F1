import "../App.css";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import FilterMenu from "../components/filtering/FilterMenu";
import useFilterConfigs from "../hooks/useFilterConfigs";
import {
  fetchTrackDominance,
  type TrackDominancePoint,
  type TrackDominanceResponse,
} from "../api/fetchTrackDominance";
import { driverCode } from "../utils/configureFilterData";
import areaChart from "../../public/images/area_chart.jpeg";
import barChart from "../../public/images/bar_chart.jpeg";

export const Visualization = () => {
  const { sessionYears, sessionName, sessionIdentifiers, driverNames } =
    useFilterConfigs();

  const [data, setData] = useState<TrackDominanceResponse>([]);
  const [loadingState, setLoadingState] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchData = async () => {
    try {
      setLoadingState(true);
      const response = await fetchTrackDominance(
        sessionName,
        sessionIdentifiers[0],
        driverNames,
        sessionYears
      );
      setData(response);
    } catch (error) {
      setLoadingState(false);
      console.error("Error fetching data:", error);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    if (data.length === 0) fetchData();
  }, []);

  useEffect(() => {
    if (!data) return;
    const driverCodes = driverNames.map((d) => driverCode[d]);
    const fastestList = driverCodes.flatMap((code) =>
      sessionYears.map((year) => `${code}_${year}`)
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const legendGroup = svg.append("g").attr("class", "legend-group");
    const trackGroup = svg
      .append("g")
      .attr("class", "track-group")
      .attr("transform", "translate(100, 0)");

    //  --- Track ---
    if (data && data.length > 0) {
      console.log("Track Dominance Data:", data);
    }
    else {
      console.log("No data available for Track Dominance visualization.");
    }
    const width = 500;
    const height = 500;
    const margin = 10;

    const xExtent = d3.extent(data, (d) => d.x) as [number, number];
    const yExtent = d3.extent(data, (d) => d.y) as [number, number];

    console.log("X Extent:", xExtent);
    console.log("Y Extent:", yExtent);

    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([margin, width - margin]);

    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([height - margin, margin]);

    // --- UNIQUE FASTEST DRIVER-YEAR LABELS ---
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(fastestList)
      .range(d3.schemeTableau10);

    const startPoint = data[0];
    const sectors = d3.group(data, (d) => d.minisector);

    const line = d3
      .line<TrackDominancePoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveCatmullRom.alpha(0.7));

    for (const [, points] of sectors) {
      console.log(points[0].fastest);
      trackGroup
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", colorScale(points[0].fastest))
        .attr("stroke-width", 8)
        .attr("d", line);
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

  return (
    <>
      <nav className="navbar">
        <FilterMenu onClickSelect={fetchData} isLoading={loadingState} />
      </nav>

      <div className="chart-container">
        <div className="track-map">
          {data && !loadingState && (
            <svg ref={svgRef} width={700} height={500}></svg>
          )}
        </div>
        <div className="supporting-chart">
          <img src={areaChart} alt="Logo" width={700} height={300} />
          <img src={barChart} alt="Logo" width={700} height={300} />
        </div>
      </div>
    </>
  );
};
