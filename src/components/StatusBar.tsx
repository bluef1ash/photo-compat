import React from "react";
import { useAppStore } from "../store/appStore";

export const StatusBar: React.FC = () => {
  const view = useAppStore((s) => s.view);
  const status = view === "processing" ? "处理中" : view === "scanning" ? "扫描中" : "就绪";
  return (
    <footer style={{ height: 28, display: "flex", alignItems: "center", padding: "0 var(--sp-m)", gap: "var(--sp-s)", fontSize: "var(--fs-caption)", color: "var(--fg-muted)", borderTop: "1px solid var(--divider)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: view === "processing" || view === "scanning" ? "var(--accent)" : "var(--fg-disabled)" }} />
      <span>{status}</span>
      <span style={{ marginLeft: "auto" }}>输出到 同目录/compat</span>
      <span>· 离线 · v1.0</span>
    </footer>
  );
};
