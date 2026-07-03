import { Suspense, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WagmiProvider, useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wagmiConfig } from "./config/wagmi";
import { BackgroundCanvas } from "./components/swap/BackgroundCanvas";

// Import custom pages
import LandingPage from "./pages/LandingPage";
import SwapPage from "./pages/SwapPage";
import ExplorePage from "./pages/ExplorePage";
import LiquidityPage from "./pages/LiquidityPage";
import WalletPage from "./pages/WalletPage";
import PortfolioPageWrapper from "./pages/PortfolioPage";
import PoolDetailsPage from "./pages/PoolDetailsPage";
import TokenDetailsPage from "./pages/TokenDetailsPage";
import { ToastContainer } from "./components/ui/ToastContainer";

import { Menu, X, Sun, Moon, Wallet, CheckCircle2, AlertCircle, Power, PlugZap, ExternalLink, ChevronDown, Plus, Layers, ChevronRight } from "lucide-react";
import { useThemeStore } from "./store/themeStore";
import { mstChain } from "./config/chains";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
    },
  },
});

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  const { address, isConnected, connector } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const chainId = useChainId();
  const onMstChain = chainId === mstChain.id;

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setShowDropdown(false);
    }
  }, [isConnected]);

  const metaMaskConnector =
    connectors.find((item) => item.name.toLowerCase().includes("metamask")) ??
    connectors.find((item) => item.id === "injected");

  const handleWalletClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isConnected && metaMaskConnector) {
      connect({ connector: metaMaskConnector, chainId: mstChain.id });
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  const links: Array<{ to?: string; label: string; subLinks?: { to: string; label: string }[] }> = [
    { to: "/", label: "Home" },
    { to: "/swap", label: "Swap" },
    { to: "/explore", label: "Explore" },
    {
      label: "Pool",
      subLinks: [
        { to: "/liquidity?view=create", label: "Create Pool" },
        { to: "/liquidity?view=list", label: "View Position" }
      ]
    },
    { to: "/portfolio", label: "Portfolio" }
  ];

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: [0, -3, 0], opacity: 1 }}
      transition={{
        y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        opacity: { duration: 0.8, ease: "easeOut" }
      }}
      className="fixed top-6 inset-x-0 z-50 w-[85%] max-w-[1200px] mx-auto"
    >
      <div className="relative w-full h-[76px]">
        {/* Large blurred radial lights behind the navbar */}
        <div className="absolute inset-0 z-[-1] overflow-hidden rounded-[32px] pointer-events-none">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-32 h-32 bg-cyan-500/30 rounded-full blur-[40px]" />
          <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/30 rounded-full blur-[40px]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-32 h-32 bg-[rgba(154,205,50,0.3)] rounded-full blur-[40px]" />
        </div>

        <div className="absolute inset-0 rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,25,0.35)] backdrop-blur-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] hover:backdrop-blur-[32px] transition-all duration-500 flex items-center justify-between px-6" >

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src={isDark ? "/Rapidex Logo White.png" : "/Rapidex Logo Black.png"}
                alt="Rapidex Logo"
                className="object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                style={{ width: "7.3rem", height: "3.5rem" }}
              />
            </Link>
          </div>

          {/* Desktop Links */}
          {!isLandingPage && (
            <div className="hidden lg:flex items-center gap-8">
              {links.map((link) => {
                if (link.subLinks) {
                  return (
                    <div key={link.label} className="relative group py-6 -my-6">
                      <button
                        className={`font-medium text-[15px] transition-all duration-300 inline-block group-hover:-translate-y-[1px] text-[rgba(255,255,255,0.65)] group-hover:text-white flex items-center gap-1`}
                      >
                        {link.label} <ChevronDown size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 rounded-[20px] border border-zinc-800/80 bg-zinc-950/95 shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 overflow-hidden flex flex-col p-1.5 z-50">
                        {link.subLinks.map(subLink => (
                          <Link
                            key={subLink.to}
                            to={subLink.to}
                            className="group/item flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                          >
                            <span className="flex items-center gap-2.5 transition-transform duration-200 group-hover/item:translate-x-0.5">
                              {subLink.label.toLowerCase().includes("create") ? (
                                <Plus size={14} className="text-zinc-500 group-hover/item:text-cyan-400 transition-colors" />
                              ) : (
                                <Layers size={14} className="text-zinc-500 group-hover/item:text-cyan-400 transition-colors" />
                              )}
                              {subLink.label}
                            </span>
                            <ChevronRight
                              size={12}
                              className="opacity-0 -translate-x-1 group-hover/item:opacity-75 group-hover/item:translate-x-0 transition-all duration-200 text-zinc-400"
                            />
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }

                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to!}
                    to={link.to!}
                    className={`font-medium text-[15px] transition-all duration-300 inline-block hover:-translate-y-[1px]
                    ${isActive ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-[rgba(255,255,255,0.65)] hover:text-white"}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right tools */}
          <div className="flex items-center gap-4">
            {isLandingPage && (
              <Link to="/swap">
                <button className="bg-white text-black font-medium rounded-[18px] px-8 py-3 shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center justify-center text-[15px]">
                  Launch App
                </button>
              </Link>
            )}
            {!isLandingPage && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={handleWalletClick}
                  className="bg-white text-black font-medium rounded-[18px] px-8 py-3 shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center justify-center gap-2 text-[15px]"
                >
                  {isConnected && address ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {`${address.slice(0, 6)}...${address.slice(-4)}`}
                    </>
                  ) : (
                    "Connect Wallet"
                  )}
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showDropdown && isConnected && address && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`absolute right-0 mt-3 w-80 rounded-3xl border p-5 shadow-2xl backdrop-blur-2xl z-50
                    ${isDark
                          ? "border-zinc-800 bg-zinc-950/95 text-white shadow-black/85"
                          : "border-zinc-200 bg-white/95 text-zinc-950 shadow-slate-200/50"}`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-display font-extrabold uppercase tracking-wider">Wallet Hub</h2>
                          <p className="text-xs font-bold font-mono text-zinc-500 mt-0.5">
                            {connector?.name ?? "MetaMask"}
                          </p>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                      </div>

                      <div className="space-y-4">
                        <div className={`rounded-2xl p-3 border ${isDark ? "bg-white/5 border-white/5" : "bg-zinc-50 border-zinc-200/40"}`}>
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Address</div>
                          <div className="mt-1.5 font-mono text-sm font-bold tracking-wide break-all">
                            {address}
                          </div>
                        </div>

                        <div className={`flex items-center gap-2.5 rounded-2xl p-3 border ${isDark ? "bg-white/5 border-white/5" : "bg-zinc-50 border-zinc-200/40"}`}>
                          {onMstChain ? (
                            <CheckCircle2 className="text-emerald-400 shrink-0" size={16} />
                          ) : (
                            <AlertCircle className="text-amber-400 shrink-0" size={16} />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold uppercase tracking-wider font-mono">
                              {onMstChain ? "MST Testnet connected" : "Wrong network"}
                            </div>
                            <div className="text-xs font-bold font-mono text-zinc-500 mt-0.5">
                              Current chain ID: {chainId}
                            </div>
                          </div>
                        </div>

                        {!onMstChain && (
                          <button
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2.5 text-xs font-display font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all"
                            disabled={isSwitching}
                            onClick={() => switchChain({ chainId: mstChain.id })}
                          >
                            <PlugZap size={14} />
                            {isSwitching ? "Switching..." : "Switch to MST Testnet"}
                          </button>
                        )}

                        <button
                          className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-display font-bold transition-all active:scale-[0.98]
                        ${isDark
                              ? "border-zinc-800 bg-white/5 text-zinc-300 hover:bg-white/10 hover:border-zinc-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 hover:border-zinc-300"}`}
                          onClick={() => {
                            disconnect();
                            setShowDropdown(false);
                          }}
                        >
                          <Power size={14} />
                          Disconnect
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {!isLandingPage && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`mx-auto mt-3 max-w-[calc(100%-2rem)] overflow-hidden rounded-3xl border p-4 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.25)] backdrop-blur-xl lg:hidden
              ${isDark ? "border-zinc-800/70 bg-zinc-950/85" : "border-slate-200/80 bg-white/85"}`}
          >
            <div className="flex flex-col gap-2">
              {links.map((link) => {
                if (link.subLinks) {
                  return (
                    <div key={link.label} className="flex flex-col gap-1">
                      <div className="px-4 py-2 text-sm font-extrabold uppercase tracking-[0.16em] text-zinc-500">{link.label}</div>
                      {link.subLinks.map(subLink => (
                        <Link
                          key={subLink.to}
                          to={subLink.to}
                          onClick={() => setIsOpen(false)}
                          className={`rounded-2xl px-4 py-2.5 ml-4 text-sm font-bold tracking-wide transition duration-200
                            ${isDark ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"}`}
                        >
                          {subLink.label}
                        </Link>
                      ))}
                    </div>
                  );
                }

                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to!}
                    to={link.to!}
                    onClick={() => setIsOpen(false)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-extrabold uppercase tracking-[0.16em] transition duration-200
                      ${isActive ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" : isDark ? "text-zinc-300 hover:bg-white/5" : "text-zinc-700 hover:bg-slate-100"}`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <button
                onClick={handleWalletClick}
                className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white hover:brightness-110 active:scale-[0.98] transition-all"
              >
                {isConnected && address ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                  </>
                ) : (
                  <>
                    <Wallet size={14} />
                    Connect Wallet
                  </>
                )}
              </button>

              <AnimatePresence>
                {showDropdown && isConnected && address && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur-xl mt-2
                      ${isDark
                        ? "border-zinc-800 bg-zinc-950/95 text-white"
                        : "border-zinc-200 bg-zinc-50 text-zinc-950"}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-display font-extrabold uppercase tracking-wider">Wallet Hub</h2>
                        <p className="text-xs font-bold font-mono text-zinc-500 mt-0.5">
                          {connector?.name ?? "MetaMask"}
                        </p>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>

                    <div className="space-y-3">
                      <div className={`rounded-xl p-2.5 border ${isDark ? "bg-white/5 border-white/5" : "bg-white border-zinc-200/50"}`}>
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Address</div>
                        <div className="mt-1 font-mono text-xs font-bold tracking-wide break-all">
                          {address}
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 rounded-xl p-2.5 border ${isDark ? "bg-white/5 border-white/5" : "bg-white border-zinc-200/50"}`}>
                        {onMstChain ? (
                          <CheckCircle2 className="text-emerald-400 shrink-0" size={14} />
                        ) : (
                          <AlertCircle className="text-amber-400 shrink-0" size={14} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold uppercase tracking-wider font-mono">
                            {onMstChain ? "MST Testnet connected" : "Wrong network"}
                          </div>
                          <div className="text-xs font-bold font-mono text-zinc-500 mt-0.5">
                            Current chain ID: {chainId}
                          </div>
                        </div>
                      </div>

                      {!onMstChain && (
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-3 py-2 text-xs font-display font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all"
                          disabled={isSwitching}
                          onClick={() => switchChain({ chainId: mstChain.id })}
                        >
                          <PlugZap size={12} />
                          {isSwitching ? "Switching..." : "Switch to MST Testnet"}
                        </button>
                      )}

                      <button
                        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-display font-bold transition-all active:scale-[0.98]
                          ${isDark
                            ? "border-zinc-800 bg-white/5 text-zinc-300 hover:bg-white/10 hover:border-zinc-700"
                            : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 hover:border-zinc-300"}`}
                        onClick={() => {
                          disconnect();
                          setShowDropdown(false);
                          setIsOpen(false);
                        }}
                      >
                        <Power size={12} />
                        Disconnect
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function MainLayout() {
  const { theme } = useThemeStore();
  const location = useLocation();
  const isDark = theme === "dark";
  const isLandingPage = location.pathname === "/";

  // Sync dark class with document element for Tailwind and custom CSS variables
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  // Initialize smooth scrolling with Lenis and sync with GSAP
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(raf);
    };
  }, []);

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 ease-in-out select-none overflow-hidden
        ${isLandingPage ? (isDark ? "text-zinc-50 bg-zinc-950" : "text-zinc-950 bg-white") : isDark ? "text-white" : "text-zinc-950"}`}
      style={{
        background: isLandingPage
          ? (isDark ? "#09090b" : "#ffffff")
          : isDark
            ? "radial-gradient(120% 120% at 50% 0%, #0A1128 0%, #05070F 100%)"
            : "radial-gradient(120% 120% at 50% 0%, #EBF3FF 0%, #F1F5F9 100%)"
      }}
    >
      {/* Dynamic Blue Glowing background spots */}
      {!isLandingPage && (
        <>
          <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="absolute top-[40%] right-[10%] w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none z-0" />
          <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none z-0" />
        </>
      )}

      {/* Global persistent 3D WebGL Canvas Background */}
      {!isLandingPage && <BackgroundCanvas />}

      {/* Global Toast Alerts */}
      <ToastContainer />

      {/* Navigation Navbar */}
      <Navigation />

      {/* Page Routing */}
      <div className="relative z-10">
        <Suspense fallback={
          <div className="flex h-[80vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 animate-pulse">
            Loading System Console...
          </div>
        }>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/liquidity" element={<LiquidityPage />} />
            <Route path="/portfolio" element={<PortfolioPageWrapper />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/pools/:address" element={<PoolDetailsPage />} />
            <Route path="/tokens/:address" element={<TokenDetailsPage />} />

          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MainLayout />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
