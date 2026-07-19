import React from "react";
import { Icon } from "../icons/Icons";

export const TitleBar: React.FC = () => (
  <header style={{ height: 40, display: "flex", alignItems: "center", padding: "0 var(--sp-m)", gap: "var(--sp-xs)", borderBottom: "1px solid var(--divider)" }}>
    <Icon name="folder" size={18} />
    <span style={{ fontWeight: 600 }}>照片适配助手</span>
    <span style={{ marginLeft: "auto", fontSize: "var(--fs-caption)", color: "var(--fg-muted)" }}>标准兼容模式</span>
  </header>
);
