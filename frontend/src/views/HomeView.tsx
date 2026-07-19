import React from "react";
import { DropZone } from "../components/DropZone";
import { useAppStore } from "../store/appStore";

export const HomeView: React.FC = () => {
  const error = useAppStore((s) => s.error);
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--sp-l)" }}>
      <div>
        <h1 style={{ fontSize: "var(--fs-title)", margin: 0 }}>把照片变成任何老旧系统都能上传的格式</h1>
        <p style={{ color: "var(--fg-muted)", margin: "var(--sp-xs) 0 0" }}>全程离线,不上传任何文件,安全放心</p>
      </div>
      <DropZone />
      {error && (
        <div role="alert" style={{ color: "var(--error)", background: "var(--error-soft)", padding: "var(--sp-s) var(--sp-m)", borderRadius: "var(--radius-sm)" }}>
          {error}
        </div>
      )}
      <div style={{ color: "var(--fg-muted)", fontSize: "var(--fs-caption)" }}>
        支持 JPEG / PNG / HEIC / WebP / GIF / TIFF · 自动转换为高兼容 JPEG
      </div>
    </div>
  );
};
