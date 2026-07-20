import React from "react";

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-2 bg-border rounded-sm overflow-hidden">
    <div
      className="h-full bg-accent transition-[width] duration-150 ease-out w-[var(--progress)]"
      style={{ "--progress": `${Math.min(100, Math.max(0, value))}%` } as React.CSSProperties}
    />
  </div>
);
