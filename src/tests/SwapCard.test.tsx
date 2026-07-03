import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig } from "wagmi";
import { wagmiConfig } from "../config/wagmi";
import SwapCard from "../components/swap/SwapCard";

describe("SwapCard", () => {
  it("renders swap title", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WagmiConfig config={wagmiConfig}>
            <SwapCard />
          </WagmiConfig>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Swap")).toBeDefined();
  });
});
