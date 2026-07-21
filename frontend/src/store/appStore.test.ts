import { beforeEach, describe, expect, it, vi } from 'vitest'

// mock IPC 层
vi.mock('../ipc/commands', () => ({
  scanDirectory: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  pauseProcess: vi.fn(),
  resumeProcess: vi.fn(),
  openOutput: vi.fn(),
}))

// mock Tauri dialog API
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}))

// mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

// mock Tauri path API
vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn(async (a: string, b: string) => `${a}/${b}`),
}))

describe('appStore 状态机', () => {
  beforeEach(async () => {
    const { useAppStore } = await import('./appStore')
    useAppStore.getState().reset()
    vi.clearAllMocks()
  })

  it('初始视图为 home', async () => {
    const { useAppStore } = await import('./appStore')
    expect(useAppStore.getState().view).toBe('home')
  })

  it('reset 回到 home 且清空业务状态', async () => {
    const { useAppStore } = await import('./appStore')
    const s = useAppStore.getState()
    s.setError('err')
    s.reset()
    expect(useAppStore.getState().view).toBe('home')
    expect(useAppStore.getState().error).toBeNull()
  })

  it('空目录回 home 且显示错误（§15.1）', async () => {
    const { useAppStore } = await import('./appStore')
    const { scanDirectory } = await import('../ipc/commands')
    const { open } = await import('@tauri-apps/plugin-dialog')

    // mock dialog 返回路径
    vi.mocked(open).mockResolvedValue('/test/path')
    // mock scanDirectory 返回空结果
    vi.mocked(scanDirectory).mockResolvedValue({
      total: 0,
      by_format: {},
      unsupported: [],
      source_dir: '/test/path',
    })

    await useAppStore.getState().selectFolder()

    expect(useAppStore.getState().view).toBe('home')
    expect(useAppStore.getState().error).not.toBeNull()
    expect(useAppStore.getState().error).toContain('没有可处理的照片')
  })
})
