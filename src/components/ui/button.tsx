import React from "react";
import { useThemeStore } from "@/store/themeStore";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
}

export function Button({ className, variant = "default", children, ...props }: ButtonProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const baseStyle = "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 px-5 py-2.5 rounded-full active:scale-[0.98] transition-all";
  
  const variantStyles = {
    default: isDark
      ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
      : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 border border-cyan-500/20 shadow-lg shadow-cyan-500/5",
    outline: "border border-border bg-transparent hover:bg-surface/50 text-foreground",
    ghost: "hover:bg-surface/50 text-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant] || variantStyles.default} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
