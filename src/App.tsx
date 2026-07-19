import React from "react";
import { IconSprite } from "./icons/Icons";
import { TitleBar } from "./components/TitleBar";
import { StatusBar } from "./components/StatusBar";
import { Stepper } from "./components/Stepper";
import { useAppStore } from "./store/appStore";

const App: React.FC = () => {
  const view = useAppStore((s) => s.view);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <IconSprite />
      <TitleBar />
      {view !== "home" && <Stepper />}
      <main style={{ flex: 1, overflow: "auto", padding: "var(--sp-l)" }}>
        {/* 任务 12 替换为真实 views */}
        <div style={{ padding: "var(--sp-l)" }}>当前视图: {view} (任务 12 实现具体内容)</div>
      </main>
      <StatusBar />
    </div>
  );
};

export default App;
