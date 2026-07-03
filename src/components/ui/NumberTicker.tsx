import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface NumberTickerProps {
  value: string | number;
  className?: string;
}

export function NumberTicker({ value, className = "" }: NumberTickerProps) {
  const [characters, setCharacters] = useState<string[]>([]);

  useEffect(() => {
    // Parse value into individual characters
    const str = String(value);
    setCharacters(str.split(""));
  }, [value]);

  return (
    <div className={`flex overflow-hidden font-display leading-none select-none ${className}`}>
      {characters.map((char, index) => {
        const isDigit = !isNaN(Number(char)) && char !== " ";

        if (!isDigit) {
          // Render dots, commas, spaces or symbols statically
          return (
            <motion.span
              key={`static-${index}-${char}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-block"
            >
              {char}
            </motion.span>
          );
        }

        // Numerical digit: render a vertical slider 0-9
        return (
          <DigitColumn
            key={`digit-${index}`}
            digit={Number(char)}
          />
        );
      })}
    </div>
  );
}

interface DigitColumnProps {
  digit: number;
}

function DigitColumn({ digit }: DigitColumnProps) {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  // Slide height proportional to active digit index
  // 10% translation per digit value
  return (
    <div className="relative h-[1em] w-[0.6em] overflow-hidden inline-flex flex-col select-none">
      <motion.div
        animate={{ y: `-${digit * 10}%` }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 140,
        }}
        className="absolute top-0 left-0 flex flex-col justify-start items-center w-full"
      >
        {numbers.map((num) => (
          <span
            key={num}
            className="h-[1em] flex items-center justify-center font-display"
            style={{ height: "1em", lineHeight: "1" }}
          >
            {num}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
