import React, { useEffect } from "react";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Button";
import { useAppStore } from "../store/appStore";

export const ProcessingView: React.FC = () => {
  const progress = useAppStore((s) => s.progress);
  const paused = useAppStore((s) => s.paused);
  const togglePause = useAppStore((s) => s.togglePause);
  const cancel = useAppStore((s) => s.cancel);

  // §5.4 Space 暂停/继续
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause]);

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-l)", maxWidth: 900, margin: "0 auto" }}>
      <div>
        <div className="tnum" style={{ fontSize: 48, fontWeight: 600 }}>{pct}%</div>
        <ProgressBar value={pct} />
        <div style={{ color: "var(--fg-muted)", marginTop: "var(--sp-xs)" }}>
          已处理 {progress?.done ?? 0} / {progress?.total ?? 0}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-m)" }}>
        <StatCard value={progress?.done ?? 0} label="已处理" />
        <StatCard value={progress?.failed ?? 0} label="失败" tone={(progress?.failed ?? 0) > 0 ? "error" : "default"} />
        <StatCard value={progress?.skipped ?? 0} label="跳过" tone="muted" />
        <StatCard value={paused ? "已暂停" : "运行中"} label="状态" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-s)" }}>
        <Button variant="destructive" onClick={cancel}>取消</Button>
        <Button variant="secondary" onClick={togglePause}>{paused ? "继续" : "暂停"}</Button>
      </div>
    </div>
  );
};
