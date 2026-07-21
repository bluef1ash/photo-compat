import { Box } from '@mui/material'
import type React from 'react'
import { StatusBar } from './components/StatusBar'
import { Stepper } from './components/Stepper'
import { TitleBar } from './components/TitleBar'
import { useAppStore } from './store/appStore'
import { CompletedView } from './views/Completed'
import { HomeView } from './views/Home'
import { ProcessingView } from './views/Processing'
import { ResultView } from './views/Result'
import { ScanningView } from './views/Scanning'

const App: React.FC = () => {
  const view = useAppStore((s) => s.view)
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar />
      {view !== 'home' && <Stepper />}
      <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {view === 'home' && <HomeView />}
        {view === 'scanning' && <ScanningView />}
        {view === 'result' && <ResultView />}
        {view === 'processing' && <ProcessingView />}
        {view === 'completed' && <CompletedView />}
      </Box>
      <StatusBar />
    </Box>
  )
}

export default App
