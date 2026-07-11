import { useEffect } from "react";
import Hero from "../components/landing/Hero";
import SelectedWorks from "../components/landing/SelectedWorks";
import Journal from "../components/landing/Journal";
import Explorations from "../components/landing/Explorations";
import Stats from "../components/landing/Stats";
import Footer from "../components/landing/Footer";
import { useThemeStore } from "../store/themeStore";

export default function LandingPage() {
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === "dark";

  // Force default theme ("dark") on landing page
  useEffect(() => {
    if (theme !== "dark") {
      setTheme("dark");
    }
  }, [theme, setTheme]);

  // Sync page metadata titles for SEO and premium feel
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Rapidex | Trade Smarter. Swap Faster.";

    // Smooth scroll top on enter
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      document.title = originalTitle;
    };
  }, []);

  return (
    <div className={`w-full flex flex-col min-h-screen transition-colors duration-300 relative ${isDark ? "bg-zinc-950 text-white" : "bg-white text-zinc-900"
      }`}>
      {/* Main Sections Body */}
      <main className="flex-1 w-full relative z-10">
        <Hero />
        <SelectedWorks />
        {/* <Journal /> */}
        <Explorations />
        {/* <Stats /> */}
      </main>

      {/* Footer Section links */}
      <Footer />
    </div>
  );
}
