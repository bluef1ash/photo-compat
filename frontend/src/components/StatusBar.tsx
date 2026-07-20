import React from 'react'
import { useAppStore } from '../store/appStore'

export const StatusBar: React.FC = () => {
  const view = useAppStore((s) => s.view)
  const status = view === 'processing' ? '处理中' : view === 'scanning' ? '扫描中' : '就绪'
  return (
    <footer className="h-7 flex items-center px-4 gap-3 text-caption text-fg-muted border-t border-divider">
      <span
        className={`w-2 h-2 rounded-full ${view === 'processing' || view === 'scanning' ? 'bg-accent' : 'bg-fg-disabled'}`}
      />
      <span>{status}</span>
      <span className="ml-auto">输出到 同目录/compat</span>
      <span>· 离线 · v1.0</span>
    </footer>
  )
}
