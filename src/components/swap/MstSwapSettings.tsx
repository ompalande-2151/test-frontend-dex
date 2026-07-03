import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useSwapStore } from "../../store/swapStore";

interface MstSwapSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  slippage: number; // in basis points (e.g. 50 = 0.5%)
  setSlippage: (bps: number) => void;
  theme: "light" | "dark";
}

export const MstSwapSettings: React.FC<MstSwapSettingsProps> = ({
  isOpen,
  onClose,
  slippage,
  setSlippage,
  theme,
}) => {
  const {
    deadlineMins,
    setDeadlineMins,
    useRouterApi,
    setUseRouterApi
  } = useSwapStore();

  const [isAuto, setIsAuto] = useState(slippage === 50);
  const [customVal, setCustomVal] = useState("");
  const [l2Toggle, setL2Toggle] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";
  const slippagePercent = (slippage / 100).toString();

  // Sync isAuto when slippage changes externally
  useEffect(() => {
    setIsAuto(slippage === 50);
  }, [slippage]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setTimeout(() => onClose(), 50);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handlePreset = (percent: number) => {
    setIsAuto(false);
    setCustomVal("");
    setSlippage(percent * 100);
  };

  const handleAuto = () => {
    setIsAuto(true);
    setCustomVal("");
    setSlippage(50); // Default 0.5%
  };

  const handleCustomChange = (val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setCustomVal(val);
      setIsAuto(false);
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        setSlippage(Math.round(parsed * 100));
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`absolute right-0 top-11 w-[340px] p-5 rounded-[24px] border shadow-2xl z-40
            ${
              isDark
                ? "bg-[#131A2A] border-[#2C364F] text-white"
                : "bg-white border-zinc-150 text-zinc-950"
            }`}
        >
          {/* Title */}
          <div className="text-sm font-bold uppercase tracking-wider mb-4 opacity-70">
            MSWAP Settings
          </div>

          {/* Slippage tolerance */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-1.5 text-base font-semibold">
              <span>Slippage tolerance</span>
              <HelpCircle size={15} className="opacity-40 cursor-help" />
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={handleAuto}
                className={`flex-1 py-2 px-3 rounded-[12px] font-bold text-sm border transition-all duration-150
                  ${
                    isAuto
                      ? "bg-[#FB118E] border-[#FB118E] text-white"
                      : isDark
                      ? "bg-[#1B2236] border-[#2C364F] text-white hover:bg-[#2C364F]"
                      : "bg-[#F5F6FC] border-zinc-200 text-zinc-800 hover:bg-zinc-150"
                  }`}
              >
                Auto
              </button>

              {[0.1, 0.5, 1.0].map((val) => {
                const isSelected = !isAuto && slippage === val * 100;
                return (
                  <button
                    key={val}
                    onClick={() => handlePreset(val)}
                    className={`py-2 px-2.5 rounded-[12px] font-bold text-sm border transition-all duration-150
                      ${
                        isSelected
                          ? "bg-[#FB118E] border-[#FB118E] text-white"
                          : isDark
                          ? "bg-[#1B2236] border-[#2C364F] text-white hover:bg-[#2C364F]"
                          : "bg-[#F5F6FC] border-zinc-200 text-zinc-800 hover:bg-zinc-150"
                      }`}
                  >
                    {val}%
                  </button>
                );
              })}

              <div className="relative w-16 flex items-center">
                <input
                  type="text"
                  placeholder={isAuto ? "0.50" : slippagePercent}
                  value={customVal}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className={`w-full py-2 pl-2 pr-5 rounded-[12px] outline-none text-sm font-bold text-right border transition-all duration-150
                    ${
                      !isAuto && customVal !== ""
                        ? "border-[#FB118E] text-[#FB118E] bg-transparent"
                        : isDark
                        ? "bg-[#1B2236] border-[#2C364F] text-white placeholder-zinc-500"
                        : "bg-[#F5F6FC] border-zinc-200 text-zinc-800 placeholder-zinc-400"
                    }`}
                />
                <span className="absolute right-2 text-sm font-bold opacity-45 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* Custom slippage warnings */}
            {!isAuto && (slippage < 50 || slippage > 500) && (
              <div className="text-xs font-medium text-amber-500 leading-snug pt-1">
                {slippage < 50
                  ? "Slippage is low. Your transaction may revert."
                  : "Slippage is high. Your transaction may be frontrun."}
              </div>
            )}
          </div>

          {/* Deadline */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1.5 text-base font-semibold">
              <span>Transaction deadline</span>
              <HelpCircle size={15} className="opacity-40 cursor-help" />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deadlineMins === 0 ? "" : deadlineMins.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*$/.test(val)) {
                    setDeadlineMins(val === "" ? 0 : Number(val));
                  }
                }}
                className={`w-16 py-2 px-3 rounded-[12px] outline-none text-sm font-bold text-center border transition-all duration-150
                  ${
                    isDark
                      ? "bg-[#1B2236] border-[#2C364F] text-white"
                      : "bg-[#F5F6FC] border-zinc-200 text-zinc-800"
                  }`}
              />
              <span className="text-sm font-semibold opacity-60">minutes</span>
            </div>
          </div>

          {/* Divider */}
          <div className={`h-[1px] my-4 ${isDark ? "bg-[#2C364F]" : "bg-zinc-150"}`} />

          {/* Settings Switches */}
          <div className="space-y-4">
            <div className="text-sm font-bold uppercase tracking-wider opacity-70">
              Interface Settings
            </div>

            {/* Router */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold leading-normal">MSWAP Router API</span>
              <button
                onClick={() => setUseRouterApi(!useRouterApi)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                  ${useRouterApi ? "bg-[#FB118E]" : isDark ? "bg-zinc-800" : "bg-zinc-200"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${useRouterApi ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>

            {/* L2 Optimizations */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold leading-normal">MSWAP Gas Optimizations</span>
              <button
                onClick={() => setL2Toggle(!l2Toggle)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                  ${l2Toggle ? "bg-[#FB118E]" : isDark ? "bg-zinc-800" : "bg-zinc-200"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${l2Toggle ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
