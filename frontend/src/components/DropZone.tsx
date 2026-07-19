import React, { useCallback } from "react";
import { Icon } from "../icons/Icons";
import { Button } from "./Button";
import { useAppStore } from "../store/appStore";

export const DropZone: React.FC = () => {
  const selectFolder = useAppStore((s) => s.selectFolder);
  const [hover, setHover] = React.useState(false);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setHover(false);
      // MVP:拖拽到文件夹选择走同一入口(系统选择器);拖拽仅作视觉反馈。
      // 完整拖拽路径处理(直接取 dropped 文件夹路径)在后续增量。
      await selectFolder();
    },
    [selectFolder]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      aria-label="拖入文件夹或选择文件夹"
      onKeyDown={(e) => { if (e.key === "Enter") selectFolder(); }}
      style={{
        border: `2px ${hover ? "solid" : "dashed"} var(--accent)`,
        borderRadius: "var(--radius-md)",
        background: hover ? "var(--accent-soft)" : "var(--surface-alt)",
        padding: "var(--sp-xxl)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--sp-m)",
      }}
    >
      <Icon name="folder" size={48} />
      <div>把包含照片的文件夹拖到这里</div>
      <div style={{ color: "var(--fg-muted)" }}>— 或 —</div>
      <Button variant="primary" size="large" onClick={selectFolder}>
        <Icon name="folder" /> 选择文件夹
      </Button>
    </div>
  );
};
