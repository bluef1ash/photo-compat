import React from "react";
import { DropZone } from "../components/DropZone";
import { useAppStore } from "../store/appStore";

export const HomeView: React.FC = () => {
  const error = useAppStore((s) => s.error);
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-title m-0">把照片变成任何老旧系统都能上传的格式</h1>
        <p className="text-fg-muted mt-2 mb-0">全程离线,不上传任何文件,安全放心</p>
      </div>
      <DropZone />
      {error && (
        <div role="alert" className="text-error bg-error-soft p-3 rounded-sm">
          {error}
        </div>
      )}
      <div className="text-fg-muted text-caption">
        支持 JPEG / PNG / HEIC / WebP / GIF / TIFF · 自动转换为高兼容 JPEG
      </div>
    </div>
  );
};
