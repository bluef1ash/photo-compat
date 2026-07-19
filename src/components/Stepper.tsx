import React from "react";
import { useAppStore } from "../store/appStore";

const STEPS = ["选目录", "查看结果", "处理", "完成"] as const;

export const Stepper: React.FC = () => {
  const view = useAppStore((s) => s.view);
  const order: Record<string, number> = { home: 0, scanning: 0, result: 1, processing: 2, completed: 3 };
  const current = order[view] ?? 0;
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "var(--sp-xs)", padding: "var(--sp-s) var(--sp-l)" }}>
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-xs)" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
              background: i < current ? "var(--accent)" : i === current ? "var(--accent)" : "var(--border-strong)",
              color: i <= current ? "#fff" : "var(--fg-muted)",
            }}>{i + 1}</div>
            <span style={{ color: i <= current ? "var(--fg)" : "var(--fg-muted)", fontSize: "var(--fs-caption)" }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />}
        </React.Fragment>
      ))}
    </nav>
  );
};
