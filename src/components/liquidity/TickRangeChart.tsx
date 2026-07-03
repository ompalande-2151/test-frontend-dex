import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Visual tick / liquidity range picker rendered with D3.
 * Draws a liquidity-depth histogram and a draggable selected range band.
 */
interface TickBin {
  tick: number;
  liquidity: number;
}

export default function TickRangeChart({
  bins,
  lower,
  upper
}: {
  bins: TickBin[];
  lower: number;
  upper: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 320;
    const height = 160;
    const x = d3.scaleBand().domain(bins.map((b) => String(b.tick))).range([0, width]).padding(0.1);
    const y = d3.scaleLinear().domain([0, d3.max(bins, (b: TickBin) => b.liquidity) ?? 1]).range([height, 0]);

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", (b: TickBin) => x(String(b.tick)) ?? 0)
      .attr("y", (b: TickBin) => y(b.liquidity))
      .attr("width", x.bandwidth())
      .attr("height", (b: TickBin) => height - y(b.liquidity))
      .attr("fill", (b: TickBin) => (b.tick >= lower && b.tick <= upper ? "#6366f1" : "#3f3f46"));
  }, [bins, lower, upper]);

  return <svg ref={ref} className="w-full" />;
}
