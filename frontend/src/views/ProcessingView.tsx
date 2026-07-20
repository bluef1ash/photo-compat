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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <div className="tabular-nums font-mono text-display-num-lg font-semibold">{pct}%</div>
        <ProgressBar value={pct} />
        <div className="text-fg-muted mt-2">
          已处理 {progress?.done ?? 0} / {progress?.total ?? 0}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard value={progress?.done ?? 0} label="已处理" />
        <StatCard value={progress?.failed ?? 0} label="失败" tone={(progress?.failed ?? 0) > 0 ? "error" : "default"} />
        <StatCard value={progress?.skipped ?? 0} label="跳过" tone="muted" />
        <StatCard value={paused ? "已暂停" : "运行中"} label="状态" />
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="destructive" onClick={cancel}>取消</Button>
        <Button variant="secondary" onClick={togglePause}>{paused ? "继续" : "暂停"}</Button>
      </div>
    </div>
  );
};
