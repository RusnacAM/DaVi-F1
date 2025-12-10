import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { type LapGapEvolutionPoint } from "../api/fetchLapGapEvolution";
import { getDriverYearColor } from "../utils/configureFilterData";

export interface Corner {
    distance: number;
    label: string;
}

export interface LapGapEvolutionProps {
    lapGaps: Record<string, LapGapEvolutionPoint[]>;
    corners: Corner[];
    sessionYears: string[];
    driverColorMap: Record<string, string>;
}

export const LapGapEvolution: React.FC<LapGapEvolutionProps> = ({
    lapGaps,
    sessionYears,
    corners,
    driverColorMap,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!lapGaps || Object.keys(lapGaps).length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = 800;
        const height = 325;
        const margin = { top: 50, right: 100, bottom: 50, left: 70 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const drivers = Object.keys(lapGaps);

        // Flatten all non-reference points for scales
        const allPoints = Object.entries(lapGaps)
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
            .text(`Lap Gap Evolution to fastest driver with corner identification`);

        // Scales
        const xExtent = d3.extent(allPoints, (d) => d.x) as [number, number];
        
        // Fix: d3.extent only sees 'slower' drivers (gaps > 0). 
        // We must manually include 0 in the domain to represent the reference driver correctly.
        const yMin = d3.min(allPoints, (d) => d.y) || 0;
        const yMax = d3.max(allPoints, (d) => d.y) || 0;

        const xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([Math.min(0, yMin), Math.max(0, yMax)]) // Ensure 0 is included
            .nice() // Round the domain nicely
            .range([innerHeight, 0]);

        const colorScale = (fastest: string) => getDriverYearColor(fastest, driverColorMap, sessionYears);

        // X Axis
        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("font-size", "12px")
            .style("fill", "#fff");

        // X Label
        g.append("text")
            .attr("transform", `translate(0,${innerHeight})`)
            .attr("y", 40)
            .attr("x", innerWidth / 2)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("fill", "#fff")
            .text("Track Distance (m)");

        // Y Axis
        g.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .style("font-size", "12px")
            .style("fill", "#fff");

        // Y Label
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -innerHeight / 2)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("fill", "#fff")
            .text("Time Difference (s)");

        // Draw reference driver as horizontal line y=0
        g.append("line")
            .attr("x1", 0)
            .attr("y1", yScale(0))
            .attr("x2", innerWidth)
            .attr("y2", yScale(0))
            .attr("stroke", "white")
            .attr("stroke-dasharray", "5,5")
            .attr("stroke-width", 2)
            .attr("opacity", 0.5);

        // Line generator
        const line = d3
            .line<LapGapEvolutionPoint>()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y));

        // Draw non-reference driver-year lines
        drivers.forEach((driverKey) => {
            g.append("path")
                .datum(lapGaps[driverKey])
                .attr("stroke", () => {
                    // Backend sends "VER 2023", Map expects "VER_2023"
                    const key = driverKey.replace(" ", "_");
                    return colorScale(key);
                })
                .attr("fill", "none")
                .attr("stroke-width", 2)
                .attr("d", line);
        });

        // Create tooltip container
        const tooltip = g.append("g")
            .attr("class", "tooltip")
            .style("visibility", "hidden");

        const tooltipRect = tooltip.append("rect")
            .attr("fill", "rgba(0, 0, 0, 0.8)")
            .attr("rx", 5)
            .attr("ry", 5);

        const tooltipText = tooltip.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .attr("font-size", "12px");

        const hoverLine = g.append("line")
            .attr("stroke", "white")
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .attr("stroke-dasharray", "2,2")
            .style("pointer-events", "none")
            .style("visibility", "hidden");

        // Interaction Rect
        g.append("rect")
            .attr("width", innerWidth)
            .attr("height", innerHeight)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mousemove", (event) => {
                const [mx] = d3.pointer(event);
                const x0 = xScale.invert(mx);

                // Build tooltip content
                // Gather data points at this X
                const currentData = Object.keys(lapGaps).map((driverKey) => {
                    const points = lapGaps[driverKey];
                    const bisect = d3.bisector((d: LapGapEvolutionPoint) => d.x).left;
                    const i = bisect(points, x0);
                    // Handle edge cases for bisect
                    const point = points[Math.min(i, points.length - 1)] || points[points.length - 1];
                    return { key: driverKey, gap: point.y };
                });

                // Sort by gap size (descending) so the list order roughly matches line height
                currentData.sort((a, b) => b.gap - a.gap);

                tooltipText.selectAll("*").remove();

                currentData.forEach((d, index) => {
                    tooltipText.append("tspan")
                        .attr("x", 10)
                        .attr("y", 20 + index * 15)
                        .text(`${d.key}: ${d.gap.toFixed(3)} s`);
                });

                const bbox = tooltipText.node()?.getBBox();
                if (bbox) {
                    tooltipRect
                        .attr("width", bbox.width + 20)
                        .attr("height", bbox.height + 20);
                }

                // Prevent tooltip from overflowing the right side
                let tooltipX = mx + 10;
                if (tooltipX + (bbox?.width || 100) > innerWidth) {
                    tooltipX = mx - (bbox?.width || 100) - 20;
                }

                tooltip
                    .style("visibility", "visible")
                    .attr("transform", `translate(${tooltipX}, 0)`);

                hoverLine
                    .attr("x1", mx)
                    .attr("x2", mx)
                    .style("visibility", "visible");
            })
            .on("mouseleave", () => {
                tooltip.style("visibility", "hidden");
                hoverLine.style("visibility", "hidden");
            });

        // Draw dotted lines for each corner
        corners.forEach((corner) => {
            const xPos = xScale(corner.distance);

            // Dotted line
            g.append("line")
                .attr("x1", xPos)
                .attr("x2", xPos)
                .attr("y1", 0)
                .attr("y2", innerHeight)
                .attr("stroke", "rgba(255, 255, 255, 0.3)")
                .attr("stroke-dasharray", "2,2")
                .attr("stroke-width", 1);

            // Label
            g.append("text")
                .attr("x", xPos)
                .attr("y", -5)
                .attr("text-anchor", "middle")
                .attr("fill", "rgba(255, 255, 255, 0.7)")
                .attr("font-size", "10px")
                .text(corner.label);
        });
    }, [lapGaps, corners]);

    return <svg ref={svgRef} width={800} height={325}></svg>;
};