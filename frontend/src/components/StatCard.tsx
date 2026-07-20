import React from "react";

export const StatCard: React.FC<{
  value: React.ReactNode;
  label: string;
  tone?: "default" | "error" | "muted";
}> = ({ value, label, tone = "default" }) => (
  <div className="bg-surface border border-border rounded-md p-4">
    <div
      className={`tabular-nums font-mono text-3xl font-semibold ${
        tone === "error"
          ? "text-error"
          : tone === "muted"
            ? "text-fg-muted"
            : "text-fg"
      }`}
    >
      {value}
    </div>
    <div className="text-caption text-fg-muted">{label}</div>
  </div>
);
