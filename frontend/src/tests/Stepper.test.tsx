import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/appStore'
import { renderWithTheme } from '../test-utils'
import { Stepper } from '../components/Stepper'

// mock IPC/Tauri 层,避免 store 加载时的副作用
vi.mock('../../ipc/commands', () => ({
  scanDirectory: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  pauseProcess: vi.fn(),
  resumeProcess: vi.fn(),
  openOutput: vi.fn(),
}))
vi.mock('@tauri-apps/api/dialog', () => ({ open: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(() => {})) }))
vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn(async (a: string, b: string) => `${a}/${b}`),
}))

describe('Stepper', () => {
  beforeEach(() => {
    useAppStore.getState().reset()
  })

  it('渲染 4 个步骤', () => {
    useAppStore.setState({ view: 'result' })
    renderWithTheme(<Stepper />)
    expect(screen.getByText('选目录')).toBeInTheDocument()
    expect(screen.getByText('查看结果')).toBeInTheDocument()
    expect(screen.getByText('处理')).toBeInTheDocument()
    expect(screen.getByText('完成')).toBeInTheDocument()
  })

  it('completed 视图时步骤渲染正常', () => {
    useAppStore.setState({ view: 'completed' })
    renderWithTheme(<Stepper />)
    expect(screen.getByText('完成')).toBeInTheDocument()
  })
})
