import React from "react";
export const ScanningView: React.FC = () => (
  <div className="flex flex-col items-center gap-4 p-12">
    <div className="w-10 h-10 rounded-full border-4 border-border border-t-accent animate-spin" />
    <div>正在扫描文件夹…</div>
  </div>
);
