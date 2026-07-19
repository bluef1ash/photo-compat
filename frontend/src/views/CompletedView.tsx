import React from "react";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Button";
import { Icon } from "../icons/Icons";
import { useAppStore } from "../store/appStore";

export const CompletedView: React.FC = () => {
  const summary = useAppStore((s) => s.summary);
  const openOutput = useAppStore((s) => s.openOutput);
  const reset = useAppStore((s) => s.reset);
  if (!summary) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-l)", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "var(--sp-l)" }}>
        <Icon name="check" size={72} />
        <h1 style={{ fontSize: "var(--fs-title)", margin: "var(--sp-s) 0" }}>处理完成!</h1>
        <p style={{ color: "var(--fg-muted)" }}>{summary.done} 张照片已转换为兼容格式</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-m)" }}>
        <StatCard value={summary.total} label="总计处理" />
        <StatCard value={summary.done} label="成功" />
        <StatCard value={summary.failed} label="失败" tone={summary.failed > 0 ? "error" : "default"} />
        <StatCard value={summary.skipped} label="跳过" tone="muted" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-s)" }}>
        <Button onClick={reset}>处理另一个文件夹</Button>
        <Button variant="primary" size="large" onClick={openOutput}><Icon name="open" /> 打开输出目录</Button>
      </div>
    </div>
  );
};
