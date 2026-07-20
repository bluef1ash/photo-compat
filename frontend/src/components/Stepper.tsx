import React from 'react'
import { useAppStore } from '../store/appStore'

const STEPS = ['选目录', '查看结果', '处理', '完成'] as const

export const Stepper: React.FC = () => {
  const view = useAppStore((s) => s.view)
  const order: Record<string, number> = {
    home: 0,
    scanning: 0,
    result: 1,
    processing: 2,
    completed: 3,
  }
  const current = order[view] ?? 0
  return (
    <nav className="flex items-center gap-2 px-6 py-3">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${i <= current ? 'bg-accent text-white' : 'bg-border-strong text-fg-muted'}`}
            >
              {i + 1}
            </div>
            <span className={`text-caption ${i <= current ? 'text-fg' : 'text-fg-muted'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className="flex-1 h-px bg-divider" />}
        </React.Fragment>
      ))}
    </nav>
  )
}
