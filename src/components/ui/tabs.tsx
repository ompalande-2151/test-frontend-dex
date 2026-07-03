import React, { createContext, useContext } from "react";

interface TabsContextProps {
  value: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = createContext<TabsContextProps | null>(null);

export function Tabs({
  value,
  onValueChange,
  className,
  children,
  ...props
}: {
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used inside Tabs");

  const isActive = context.value === value;

  return (
    <button
      type="button"
      data-state={isActive ? "active" : "inactive"}
      onClick={() => context.onValueChange?.(value)}
      className={`${className || ""} transition-all duration-200 ${
        isActive
          ? "bg-cyan-500/10 text-cyan-400 font-semibold shadow-[0_8px_28px_-22px_rgba(34,211,238,0.7)]"
          : "text-muted-foreground hover:text-white hover:bg-white/5"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used inside Tabs");

  if (context.value !== value) return null;

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
