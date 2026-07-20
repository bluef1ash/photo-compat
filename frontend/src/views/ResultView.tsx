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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <h2 className="m-0">扫描完成</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard value={scan.total} label="总图片数" />
        <StatCard value={scan.total - scan.unsupported.length} label="预计输出数量" />
        <StatCard value="—" label="预计输出大小" />
        <StatCard value="—" label="预计节省" />
      </div>
      <div>
        <div className="text-fg-muted mb-2">格式分布</div>
        <div className="flex gap-4 flex-wrap">
          {formats.map(([fmt, n]) => (
            <span key={fmt} className="bg-accent-soft px-3 py-1 rounded-sm">
              {fmt} {n}
            </span>
          ))}
        </div>
      </div>
      {scan.unsupported.length > 0 && (
        <div role="status" className="bg-warning-soft p-4 rounded-sm">
          检测到 {scan.unsupported.length} 个暂不支持的文件,将跳过
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button onClick={reset}>取消</Button>
        <Button variant="primary" onClick={startProcess}>开始处理</Button>
      </div>
    </div>
  );
};
