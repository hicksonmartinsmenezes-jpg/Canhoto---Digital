import { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}
