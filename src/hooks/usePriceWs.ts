import { useEffect, useRef } from "react";
import { API_BASE } from "../config/contracts";

export function usePriceWs(onSwapDetected: () => void) {
  const onSwapRef = useRef(onSwapDetected);

  // Keep hook callback updated without resetting connection
  useEffect(() => {
    onSwapRef.current = onSwapDetected;
  }, [onSwapDetected]);

  useEffect(() => {
    // Converts http://localhost:3001 base API URL to ws://localhost:3001/ws/prices
    const wsUrl = API_BASE.replace(/^http/, "ws") + "/ws/prices";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("⚡ Connected to MSWAP real-time pricing server");
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "swap") {
          console.log("On-chain swap event logged, refreshing stats...");
          onSwapRef.current(); // Trigger refetch
        }
      } catch (err) {
        console.error("Error parsing WebSocket price tick:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket connection error:", err);
    };

    socket.onclose = () => {
      console.log("Disconnected from MSWAP pricing server");
    };

    return () => {
      socket.close();
    };
  }, []);
}
