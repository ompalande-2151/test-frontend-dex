import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check } from "lucide-react";
import { TokenLogo } from "./TokenLogos";
import { displayTokenSymbol, TOKENS } from "../../config/contracts";
import { useTokens } from "../../hooks/api";

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
}

const POPULAR_TOKENS = ["MST", "WMST", "USDC"];

interface MstTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: string) => void;
  selectedToken: string;
  theme: "light" | "dark";
  excludeTokens?: string[];
}

export const MstTokenModal: React.FC<MstTokenModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedToken,
  theme,
  excludeTokens,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: backendTokensList } = useTokens();

  const allTokensList = useMemo(() => {
    const defaultTokens: TokenInfo[] = [
      { symbol: "MST", name: "tMST Native Token", decimals: 18 }
    ];

    if (backendTokensList && backendTokensList.length > 0) {
      const backendTokensMapped = backendTokensList.map((t: any) => ({
        symbol: t.symbol,
        name: t.symbol === "USDC" ? "USD Coin" : (t.symbol === "WMST" ? "Wrapped MST" : t.symbol + " Token"),
        decimals: t.decimals
      }));

      const merged = [...defaultTokens];
      backendTokensMapped.forEach((bt) => {
        if (!merged.find((m) => m.symbol.toLowerCase() === bt.symbol.toLowerCase())) {
          merged.push(bt);
        }
      });
      return merged;
    }

    return [
      { symbol: "MST", name: "tMST Native Token", decimals: 18 },
      ...TOKENS.map((t) => ({
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals
      }))
    ];
  }, [backendTokensList]);

  const popularTokens = useMemo(() => {
    if (excludeTokens && excludeTokens.length > 0) {
      return POPULAR_TOKENS.filter((symbol) => !excludeTokens.includes(symbol));
    }
    return POPULAR_TOKENS;
  }, [excludeTokens]);

  // Focus input when modal mounts
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const timer = setTimeout(() => {
        const input = document.getElementById("mst-token-search-input");
        if (input) input.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Filter tokens
  const filteredTokens = useMemo(() => {
    let tokens = allTokensList;
    if (excludeTokens && excludeTokens.length > 0) {
      tokens = tokens.filter((token) => !excludeTokens.includes(token.symbol));
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tokens;
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query)
    );
  }, [searchQuery, excludeTokens, allTokensList]);

  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ y: 35, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 35, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 330 }}
            className={`relative w-full max-w-[420px] rounded-[24px] border shadow-2xl overflow-hidden z-10 
              ${
                isDark
                  ? "bg-[#131A2A] border-[#2C364F] text-white"
                  : "bg-white border-zinc-100 text-zinc-950"
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-4">
              <span className="font-bold text-lg leading-none">Select a token</span>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-xl transition-colors duration-150
                  ${
                    isDark
                      ? "text-[#98A1C0] hover:text-white hover:bg-[#1B2236]"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-5 pb-4">
              <div className="relative flex items-center">
                <Search
                  size={18}
                  className={`absolute left-4 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                />
                <input
                  id="mst-token-search-input"
                  type="text"
                  placeholder="Search token name or ticker"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-3.5 pl-11 pr-4 rounded-[16px] outline-none text-base font-semibold border transition-all duration-150
                    ${
                      isDark
                        ? "bg-[#1B2236] border-[#2C364F] text-white placeholder-zinc-500 focus:border-[#FB118E]"
                        : "bg-[#F5F6FC] border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-[#FB118E]"
                    }`}
                />
              </div>
            </div>

            {/* Popular Tokens */}
            <div className="px-5 pb-4">
              <div className="flex flex-wrap gap-2">
                {popularTokens.map((symbol) => {
                  const isSelected = selectedToken === symbol;
                  return (
                    <motion.button
                      key={symbol}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelect(symbol);
                        onClose();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] border text-sm font-semibold tracking-wide transition-all duration-150
                        ${
                          isSelected
                            ? isDark
                              ? "bg-[#1B2236] border-[#FB118E] text-[#FB118E]"
                              : "bg-[#F5F6FC] border-[#FB118E] text-[#FB118E]"
                            : isDark
                            ? "bg-[#131A2A] border-[#2C364F] hover:bg-[#1B2236] text-white"
                            : "bg-white border-zinc-200 hover:bg-[#F5F6FC] text-zinc-800"
                        }`}
                    >
                      <TokenLogo symbol={symbol} size={16} />
                      <span>{displayTokenSymbol(symbol)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className={`h-[1px] ${isDark ? "bg-[#2C364F]" : "bg-zinc-150"}`} />

            {/* Token Scroll List */}
            <div
              className={`max-h-[220px] overflow-y-auto py-2 pr-1 custom-scrollbar
                ${isDark ? "bg-[#131A2A]" : "bg-white"}`}
            >
              {filteredTokens.length === 0 ? (
                <div className={`text-center py-8 text-sm ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  No results found.
                </div>
              ) : (
                filteredTokens.map((token) => {
                  const isSelected = selectedToken === token.symbol;
                  return (
                    <button
                      key={token.symbol}
                      onClick={() => {
                        onSelect(token.symbol);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-5 py-3 transition-colors duration-150 text-left
                        ${
                          isDark
                            ? "hover:bg-[#1B2236]"
                            : "hover:bg-zinc-50"
                        }
                        ${isSelected ? "opacity-90" : ""}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <TokenLogo symbol={token.symbol} size={36} className="shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-base leading-tight">
                              {displayTokenSymbol(token.symbol)}
                            </span>
                            {isSelected && (
                              <span className="text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                Active
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                          >
                            {token.name}
                          </span>
                        </div>
                      </div>

                      {/* Selection Check */}
                      {isSelected && (
                        <Check size={18} className="text-[#FB118E]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
