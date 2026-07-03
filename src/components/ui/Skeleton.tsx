import React from "react";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`animate-pulse rounded-2xl bg-zinc-800 h-24 w-full ${className || ""}`} {...props} />
  );
}

export default Skeleton;
