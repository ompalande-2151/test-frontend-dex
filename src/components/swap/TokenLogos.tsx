import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

// Gorgeous MST Blockchain Brand Logo (Geometric linear gradient)
export const MstBrandLogo: React.FC<LogoProps> = ({ size = 24, className }) => (
  <svg
    viewBox="0 0 48 48"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="mstBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB118E" />
        <stop offset="100%" stopColor="#FF7A00" />
      </linearGradient>
      <linearGradient id="mstBrandInnerGradient" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8C33FF" />
        <stop offset="100%" stopColor="#FB118E" />
      </linearGradient>
    </defs>
    <path
      d="M24 2L42 12V36L24 46L6 36V12L24 2Z"
      fill="url(#mstBrandGradient)"
      fillOpacity="0.15"
      stroke="url(#mstBrandGradient)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M24 10L36 17V31L24 38L12 31V17L24 10Z"
      fill="url(#mstBrandInnerGradient)"
      stroke="url(#mstBrandInnerGradient)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M24 15V33M18 20L24 15L30 20M18 28L24 33L30 28"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Native MST Coin
export const MstLogo: React.FC<LogoProps> = ({ size = 24, className }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="mstCoinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB118E" />
        <stop offset="50%" stopColor="#8C33FF" />
        <stop offset="100%" stopColor="#FF8B00" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="16" fill="url(#mstCoinGradient)" />
    <path
      d="M8 20L13.5 10.5L16.5 15.5L20.5 8.5L24 14.5L16 23.5L8 20Z"
      fill="white"
      fillOpacity="0.25"
    />
    <path
      d="M13.5 10.5L16 14.5L18.5 10.5L21.5 15.5H10.5L13.5 10.5Z"
      fill="white"
      fillOpacity="0.9"
    />
    <path
      d="M16 14.5L20.5 8.5L24 14.5H16Z"
      fill="white"
      fillOpacity="0.6"
    />
    <path
      d="M8 20L11 15H21L24 20H8Z"
      fill="white"
      fillOpacity="0.4"
    />
  </svg>
);

// Wrapped MST (WMST)
export const WmstLogo: React.FC<LogoProps> = ({ size = 24, className }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="wmstCoinGradient" x1="100%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#FB118E" />
        <stop offset="100%" stopColor="#8C33FF" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="16" fill="url(#wmstCoinGradient)" />
    <circle cx="16" cy="16" r="13" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.7" />
    <path
      d="M13.5 12L16 16L18.5 12L21 17H11L13.5 12Z"
      fill="white"
      fillOpacity="0.95"
    />
  </svg>
);

// USDC Coin
export const UsdcLogo: React.FC<LogoProps> = ({ size = 24, className }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="16" cy="16" r="16" fill="#2775CA" />
    <path
      d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4zm1.94 17.65c0 1.25-.79 2.01-2.07 2.08v1.39h-1.5v-1.38c-1.3-.06-2.18-.84-2.26-2.13h1.86c.07.56.45.89 1.14.89.65 0 1-.3.1-1.04v-.03c0-.62-.4-.96-1.57-1.33-1.48-.48-2.71-1.12-2.71-2.88v-.03c0-1.52 1.1-2.52 2.54-2.67V10.1h1.5v1.44c1.23.08 2.03.86 2.09 1.95h-1.8c-.06-.5-.4-.82-.98-.82-.55 0-.89.31-.89.78v.03c0 .58.46.85 1.55 1.23 1.62.56 2.75 1.22 2.75 2.92v.02z"
      fill="white"
    />
    <path
      d="M16 26.5c5.8 0 10.5-4.7 10.5-10.5S21.8 5.5 16 5.5 5.5 10.2 5.5 16 10.2 26.5 16 26.5zm0-20.25c5.38 0 9.75 4.37 9.75 9.75S21.38 25.75 16 25.75 6.25 21.38 6.25 16 10.62 6.25 16 6.25z"
      fill="white"
      opacity="0.3"
    />
  </svg>
);

export const TokenLogo: React.FC<LogoProps & { symbol: string }> = ({
  symbol,
  size = 24,
  className
}) => {
  const sym = symbol.toUpperCase();
  switch (sym) {
    case "MST":
    case "TMST":
      return <MstLogo size={size} className={className} />;
    case "WMST":
      return <WmstLogo size={size} className={className} />;
    case "USDC":
      return <UsdcLogo size={size} className={className} />;
    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`flex items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-white uppercase ${className}`}
        >
          {sym.substring(0, 2)}
        </div>
      );
  }
};
