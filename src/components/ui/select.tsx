import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SelectContextProps {
  value: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
}

const SelectContext = createContext<SelectContextProps | null>(null);

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, selectedLabel, setSelectedLabel }}>
      <div className="relative inline-block w-full sm:w-auto">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used inside Select");

  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (context.open && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setTimeout(() => context.setOpen(false), 100);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [context]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used inside Select");

  return <span>{context.selectedLabel || placeholder}</span>;
}

export function SelectContent({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used inside Select");

  if (!context.open) return null;

  return (
    <div
      className={`absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-hidden rounded-md border border-white/10 bg-zinc-950 text-white shadow-md ${className || ""}`}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

export function SelectItem({
  value,
  className,
  children,
  ...props
}: {
  value: string;
  className?: string;
  children: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used inside Select");

  const isSelected = context.value === value;

  useEffect(() => {
    if (isSelected) {
      context.setSelectedLabel(children);
    }
  }, [isSelected, children]);

  return (
    <div
      onClick={() => {
        context.onValueChange?.(value);
        context.setSelectedLabel(children);
        context.setOpen(false);
      }}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-zinc-800 focus:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer ${className || ""}`}
      {...props}
    >
      <span className="truncate">{children}</span>
    </div>
  );
}
