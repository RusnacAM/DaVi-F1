import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { type LapGapEvolutionPoint } from "../api/fetchLapGapEvolution";

export interface LapGapEvolutionProps {
    data: LapGapEvolutionPoint[];
}

export const LapGapEvolution: React.FC<LapGapEvolutionProps> = ({ data }) => {
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

        // Determine reference driver-year from first point
        const firstPoint = Object.values(data)[0][0];
        const referenceDriverYear = `${firstPoint.ref_driver} ${firstPoint.ref_year}`;

        // Flatten all non-reference points for scales
        const allPoints = Object.entries(data)
            .filter(([key]) => key !== referenceDriverYear)
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
            .text("Lap Gap Evolution");

        // Scales
        const xExtent = d3.extent(allPoints, (d) => d.x) as [number, number];
        const yExtent = d3.extent(allPoints, (d) => d.y) as [number, number];

        const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain([yExtent[0], yExtent[1]]).range([innerHeight, 0]);


        // Axes
        g
            .append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", innerWidth / 2)
            .attr("y", 40)
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .text("Track Distance (m)");

        g
            .append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
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
            .attr("stroke", "black")
            .attr("stroke-dasharray", "5,5")
            .attr("stroke-width", 2);

        // Line generator
        const line = d3
            .line<LapGapEvolutionPoint>()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y));

        // Draw non-reference driver-year lines
        drivers.forEach((driverKey, i) => {
            if (driverKey === referenceDriverYear) return;

            g.append("path")
                .datum(data[driverKey])
                .attr("fill", "none")
                .attr("stroke", d3.schemeCategory10[i % 10])
                .attr("stroke-width", 2)
                .attr("d", line);
        });

        // Legend
        const legend = svg.append("g").attr("transform", `translate(${innerWidth + margin.left + 10}, ${margin.top})`);
        drivers.forEach((driver, i) => {
            const gLegend = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
            gLegend.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", "white")
                .attr("fill", d3.schemeCategory10[i % 10]);

            gLegend.append("text")
                .attr("x", 16)
                .attr("y", 10)
                .attr("fill", "white")
                .text(driver);
        });
    }, [data]);

    return <svg ref={svgRef} width={700} height={350}></svg>;
};