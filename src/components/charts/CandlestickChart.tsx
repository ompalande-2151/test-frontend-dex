import { useEffect, useRef } from "react";
import { createChart, type CandlestickData, ColorType } from "lightweight-charts";
import { useThemeStore } from "../../store/themeStore";

interface CandlestickChartProps {
  data: CandlestickData[];
}

export default function CandlestickChart({ data }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Sanitize, sort, and deduplicate data (Crucial for lightweight-charts stability)
    const sanitizedData = [...data]
      .filter((d) => d && d.time !== undefined && d.time !== null)
      .map((d) => ({
        ...d,
        time: typeof d.time === "string" ? d.time : (d.time as number),
      }))
      .sort((a, b) => {
        const tA = typeof a.time === "number" ? a.time : new Date(a.time).getTime() / 1000;
        const tB = typeof b.time === "number" ? b.time : new Date(b.time).getTime() / 1000;
        return tA - tB;
      });

    // Deduplicate times
    const uniqueData: CandlestickData[] = [];
    const seenTimes = new Set();
    for (const item of sanitizedData) {
      const timeStr = typeof item.time === "object" ? JSON.stringify(item.time) : item.time;
      if (!seenTimes.has(timeStr)) {
        seenTimes.add(timeStr);
        uniqueData.push(item as any);
      }
    }

    if (uniqueData.length === 0) return;

    // 2. Define colors based on active theme
    const backgroundColor = "transparent";
    const textColor = isDark ? "#A1A1AA" : "#4B5563";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    const upColor = "#06B6D4"; // Cyan
    const downColor = "#F43F5E"; // Rose
    const wickUpColor = "#06B6D4";
    const wickDownColor = "#F43F5E";

    // 3. Create chart with custom premium styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor: textColor,
        fontSize: 11,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: gridColor, style: 2 },
        horzLines: { color: gridColor, style: 2 },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: isDark ? "rgba(6, 182, 212, 0.3)" : "rgba(6, 182, 212, 0.5)",
          width: 1,
          style: 3,
        },
        horzLine: {
          color: isDark ? "rgba(6, 182, 212, 0.3)" : "rgba(6, 182, 212, 0.5)",
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
    });

    // 4. Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: upColor,
      downColor: downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: wickUpColor,
      wickDownColor: wickDownColor,
    });

    candlestickSeries.setData(uniqueData);

    // 5. Fit content
    chart.timeScale().fitContent();

    // 6. Handle container resize dynamically
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Also watch for DOM changes/parent changes using ResizeObserver
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      chart.remove();
    };
  }, [data, isDark]);

  return <div ref={chartContainerRef} className="w-full h-full min-h-[320px]" />;
}
