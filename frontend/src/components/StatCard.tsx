import React from "react";
export const StatCard: React.FC<{ value: React.ReactNode; label: string; tone?: "default" | "error" | "muted" }> = ({ value, label, tone = "default" }) => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--sp-m)" }}>
    <div className="tnum" style={{ fontSize: 32, fontWeight: 600, color: tone === "error" ? "var(--error)" : tone === "muted" ? "var(--fg-muted)" : "var(--fg)" }}>{value}</div>
    <div style={{ fontSize: "var(--fs-caption)", color: "var(--fg-muted)" }}>{label}</div>
  </div>
);
