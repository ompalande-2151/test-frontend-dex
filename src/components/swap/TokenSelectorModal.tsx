import React from "react";
import { TokenLogo } from "./TokenLogos";

export function TokenAvatar({ symbol }: { symbol: string }) {
  return <TokenLogo symbol={symbol} size={24} className="h-6 w-6 shrink-0 rounded-full" />;
}
