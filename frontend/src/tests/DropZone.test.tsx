import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/appStore'
import { renderWithTheme } from '../test-utils'
import { DropZone } from '../components/DropZone'

vi.mock('../../ipc/commands', () => ({
  scanDirectory: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  pauseProcess: vi.fn(),
  resumeProcess: vi.fn(),
  openOutput: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(() => {})) }))
vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn(async (a: string, b: string) => `${a}/${b}`),
}))

describe('DropZone', () => {
  beforeEach(() => {
    useAppStore.getState().reset()
    vi.clearAllMocks()
  })

  it('渲染拖拽提示与选择按钮', () => {
    renderWithTheme(<DropZone />)
    expect(screen.getByText('把包含照片的文件夹拖到这里')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择文件夹' })).toBeInTheDocument()
  })

  it('Enter 键触发 selectFolder', () => {
    const selectFolder = vi
      .spyOn(useAppStore.getState(), 'selectFolder')
      .mockResolvedValue(undefined)
    renderWithTheme(<DropZone />)
    const zone = screen.getByLabelText('拖入文件夹或选择文件夹')
    fireEvent.keyDown(zone, { key: 'Enter' })
    expect(selectFolder).toHaveBeenCalled()
  })

  it('点击「选择文件夹」按钮触发 selectFolder', async () => {
    const selectFolder = vi
      .spyOn(useAppStore.getState(), 'selectFolder')
      .mockResolvedValue(undefined)
    renderWithTheme(<DropZone />)
    await userEvent.click(screen.getByRole('button', { name: '选择文件夹' }))
    expect(selectFolder).toHaveBeenCalled()
  })
})
