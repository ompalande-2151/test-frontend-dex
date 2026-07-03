import React from "react";

export function Avatar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

export function AvatarFallback({ className, children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={style}
      className={`flex h-full w-full items-center justify-center rounded-full text-sm font-semibold ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
