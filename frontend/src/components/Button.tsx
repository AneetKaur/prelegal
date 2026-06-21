"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  // Purple submit/primary actions (brand).
  primary:
    "bg-brand-purple text-white shadow-sm hover:bg-[#63307b] focus-visible:ring-brand-purple",
  // Outlined neutral action.
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300",
  // Low-emphasis text action.
  ghost: "text-slate-600 hover:text-slate-900 focus-visible:ring-slate-300",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Shared button so every action shares the same brand styling and focus ring. */
export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
