import React from "react";
import { IconSprite } from "./icons/Icons";
import { TitleBar } from "./components/TitleBar";
import { StatusBar } from "./components/StatusBar";
import { Stepper } from "./components/Stepper";
import { useAppStore } from "./store/appStore";
import { HomeView } from "./views/HomeView";
import { ScanningView } from "./views/ScanningView";
import { ResultView } from "./views/ResultView";
import { ProcessingView } from "./views/ProcessingView";
import { CompletedView } from "./views/CompletedView";

const App: React.FC = () => {
  const view = useAppStore((s) => s.view);
  return (
    <div className='h-full flex flex-col'>
      <IconSprite />
      <TitleBar />
      {view !== "home" && <Stepper />}
      <main className='flex-1 overflow-auto p-6'>
        {view === "home" && <HomeView />}
        {view === "scanning" && <ScanningView />}
        {view === "result" && <ResultView />}
        {view === "processing" && <ProcessingView />}
        {view === "completed" && <CompletedView />}
      </main>
      <StatusBar />
    </div>
  );
};

export default App;
