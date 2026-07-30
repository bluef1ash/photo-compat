import { convertFileSrc } from '@tauri-apps/api/tauri'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../test-utils'
import type { FileMeta } from '../types'
import { FileList } from '../components/FileList'

// convertFileSrc 在真实环境依赖 window.__TAURI_INTERNALS__，这里整体 mock 拦截
vi.mock('@tauri-apps/api/tauri', () => ({
  convertFileSrc: vi.fn(),
}))

const file = (overrides: Partial<FileMeta> = {}): FileMeta => ({
  name: 'IMG_001.jpg',
  path: 'C:/photos/IMG_001.jpg',
  format: 'JPEG',
  size_bytes: 1024,
  width: 800,
  height: 600,
  status: '去除 EXIF',
  ...overrides,
})

describe('FileList 缩略图', () => {
  it('convertFileSrc 不可用时回退占位图标（无 img）', () => {
    // 模拟非 Tauri 环境（纯 dev）：convertFileSrc 抛错
    vi.mocked(convertFileSrc).mockImplementation(() => {
      throw new Error('non-tauri')
    })
    renderWithTheme(<FileList files={[file()]} total={1} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/IMG_001\.jpg/)).toBeInTheDocument()
  })

  it('convertFileSrc 返回 URL 时渲染真实缩略图 img', () => {
    vi.mocked(convertFileSrc).mockReturnValue('http://asset.localhost/x')
    renderWithTheme(<FileList files={[file()]} total={1} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'http://asset.localhost/x')
    expect(img).toHaveAttribute('alt', 'IMG_001.jpg')
  })

  it('图片加载失败（onError）时回退占位图标', () => {
    vi.mocked(convertFileSrc).mockReturnValue('http://asset.localhost/x')
    renderWithTheme(<FileList files={[file()]} total={1} />)
    const img = screen.getByRole('img')
    fireEvent.error(img)
    // 回退后不再有 img（占位为 svg 图标，无 img role）
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
