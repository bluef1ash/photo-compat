import React from "react";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Button";
import { useAppStore } from "../store/appStore";

export const ResultView: React.FC = () => {
  const scan = useAppStore((s) => s.scan);
  const startProcess = useAppStore((s) => s.startProcess);
  const reset = useAppStore((s) => s.reset);
  if (!scan) return null;
  const formats = Object.entries(scan.by_format);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-l)", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ margin: 0 }}>扫描完成</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-m)" }}>
        <StatCard value={scan.total} label="总图片数" />
        <StatCard value={scan.total - scan.unsupported.length} label="预计输出数量" />
        <StatCard value="—" label="预计输出大小" />
        <StatCard value="—" label="预计节省" />
      </div>
      <div>
        <div style={{ color: "var(--fg-muted)", marginBottom: "var(--sp-xs)" }}>格式分布</div>
        <div style={{ display: "flex", gap: "var(--sp-m)", flexWrap: "wrap" }}>
          {formats.map(([fmt, n]) => (
            <span key={fmt} style={{ background: "var(--accent-soft)", padding: "var(--sp-xxs) var(--sp-s)", borderRadius: "var(--radius-sm)" }}>
              {fmt} {n}
            </span>
          ))}
        </div>
      </div>
      {scan.unsupported.length > 0 && (
        <div role="status" style={{ background: "var(--warning-soft)", padding: "var(--sp-m)", borderRadius: "var(--radius-sm)" }}>
          检测到 {scan.unsupported.length} 个暂不支持的文件,将跳过
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-s)" }}>
        <Button onClick={reset}>取消</Button>
        <Button variant="primary" onClick={startProcess}>开始处理</Button>
      </div>
    </div>
  );
};
