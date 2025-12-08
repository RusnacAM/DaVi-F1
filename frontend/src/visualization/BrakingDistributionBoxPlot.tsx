import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { BrakingDistributionPoint } from "../api/fetchBrakingDistribution";

interface Props {
  data: BrakingDistributionPoint[];
}

export default function BrakingDistributionBoxPlot({ data }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  // Update dimensions when container resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setDimensions({
          width: containerWidth,
          height: 400
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!data.length || !ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 40, right: 20, bottom: 80, left: 60 };

    svg.attr("width", width).attr("height", height);
    
    // Group by year_driver combination
    const grouped = d3.group(data, d => `${d.year}_${d.driver}`);
    const driverYearKeys = Array.from(grouped.keys());

    // Compute stats per year_driver combination
    const stats = Array.from(grouped).map(([key, values]) => {
      const arr = values.map(v => v.braking_distance).sort(d3.ascending);
      return {
        key,
        q1: d3.quantile(arr, 0.25) ?? 0,
        median: d3.median(arr) ?? 0,
        q3: d3.quantile(arr, 0.75) ?? 0,
        min: d3.min(arr) ?? 0,
        max: d3.max(arr) ?? 0
      };
    });

    const x = d3.scaleBand()
      .domain(driverYearKeys)
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([
        d3.min(stats, d => d.min) ?? 0,
        d3.max(stats, d => d.max) ?? 1
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const g = svg.append("g");
    const maxBoxWidth = 100;
    const boxWidth = Math.min(x.bandwidth(), maxBoxWidth);
    // Boxes
    g.selectAll("rect")
      .data(stats)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.key)! + (x.bandwidth() - boxWidth) / 2)
      .attr("y", d => y(d.q3))
      .attr("height", d => Math.max(1, y(d.q1) - y(d.q3)))
      .attr("width", boxWidth)
      .attr("stroke", "white")
      .attr("fill", "rgba(255,255,255,0.15)");

    // Median lines
    g.selectAll("line.median")
      .data(stats)
      .enter()
      .append("line")
      .attr("class", "median")
      .attr("x1", (d) => x(d.key)! + (x.bandwidth() - boxWidth) / 2)
      .attr("x2", (d) => x(d.key)! + (x.bandwidth() - boxWidth) / 2 + boxWidth)
      .attr("y1", d => y(d.median))
      .attr("y2", d => y(d.median))
      .attr("stroke", "red")
      .attr("stroke-width", 2);

    // Whiskers
    g.selectAll("line.whisker-min")
      .data(stats)
      .enter()
      .append("line")
      .attr("x1", d => x(d.key)! + x.bandwidth() / 2)
      .attr("x2", d => x(d.key)! + x.bandwidth() / 2)
      .attr("y1", d => y(d.min))
      .attr("y2", d => y(d.q1))
      .attr("stroke", "white");

    g.selectAll("line.whisker-max")
      .data(stats)
      .enter()
      .append("line")
      .attr("x1", d => x(d.key)! + x.bandwidth() / 2)
      .attr("x2", d => x(d.key)! + x.bandwidth() / 2)
      .attr("y1", d => y(d.q3))
      .attr("y2", d => y(d.max))
      .attr("stroke", "white");

    // Axes
    const xAxis = svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    // Rotate x-axis labels for better readability
    xAxis.selectAll("text")
      .attr("fill", "white")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.15em");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("fill", "white");

    // Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text("Braking Distance (m)");

    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .text("Braking Distance Distribution");
  }, [data, dimensions]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg ref={ref} />
    </div>
  );
}