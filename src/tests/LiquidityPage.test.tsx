import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig } from "wagmi";
import { wagmiConfig } from "../config/wagmi";
import LiquidityPage from "../pages/LiquidityPage";

describe("Liquidity Page", () => {
  it("renders liquidity page", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WagmiConfig config={wagmiConfig}>
            <LiquidityPage />
          </WagmiConfig>
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Liquidity Pools")).toBeDefined();
  });
});
