import React from "react";
export const ScanningView: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-m)", padding: "var(--sp-xxl)" }}>
    <div className="spinner" style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 1s linear infinite" }} />
    <div>正在扫描文件夹…</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
