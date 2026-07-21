import type React from 'react'
import { StatusBar } from './components/StatusBar'
import { Stepper } from './components/Stepper'
import { TitleBar } from './components/TitleBar'
import { IconSprite } from './icons/Icons'
import { useAppStore } from './store/appStore'
import { CompletedView } from './views/Completed'
import { HomeView } from './views/Home'
import { ProcessingView } from './views/Processing'
import { ResultView } from './views/Result'
import { ScanningView } from './views/Scanning'

const App: React.FC = () => {
  const view = useAppStore((s) => s.view)
  return (
    <div className="h-full flex flex-col">
      <IconSprite />
      <TitleBar />
      {view !== 'home' && <Stepper />}
      <main className="flex-1 overflow-auto p-6">
        {view === 'home' && <HomeView />}
        {view === 'scanning' && <ScanningView />}
        {view === 'result' && <ResultView />}
        {view === 'processing' && <ProcessingView />}
        {view === 'completed' && <CompletedView />}
      </main>
      <StatusBar />
    </div>
  )
}

export default App
