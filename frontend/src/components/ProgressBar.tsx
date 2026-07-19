import React from "react";
export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div style={{ height: 8, background: "var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: "var(--accent)", transition: "width 150ms ease" }} />
  </div>
);
