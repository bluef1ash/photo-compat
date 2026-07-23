import { convertFileSrc } from '@tauri-apps/api/core'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../test-utils'
import type { FileMeta } from '../types'
import { PreviewDialog } from '../components/PreviewDialog'

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn(),
}))

const mkFile = (name: string, overrides: Partial<FileMeta> = {}): FileMeta => ({
  name,
  path: `C:/photos/${name}`,
  format: 'JPEG',
  size_bytes: 1024,
  width: 800,
  height: 600,
  status: '去除 EXIF',
  ...overrides,
})

describe('PreviewDialog', () => {
  it('打开时渲染文件名、序号与图片', () => {
    vi.mocked(convertFileSrc).mockReturnValue('http://asset.localhost/a')
    const files = [mkFile('a.jpg'), mkFile('b.jpg')]
    renderWithTheme(<PreviewDialog files={files} initialIndex={0} onClose={vi.fn()} />)
    expect(screen.getByText('a.jpg')).toBeInTheDocument()
    expect(screen.getAllByText('1 / 2').length).toBeGreaterThan(0)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://asset.localhost/a')
  })

  it('点击"下一张"切换到第二张', () => {
    vi.mocked(convertFileSrc).mockImplementation((p: string) => `http://asset.localhost/${p}`)
    const files = [mkFile('a.jpg'), mkFile('b.jpg')]
    renderWithTheme(<PreviewDialog files={files} initialIndex={0} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '下一张' }))
    expect(screen.getByText('b.jpg')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://asset.localhost/C:/photos/b.jpg')
  })

  it('convertFileSrc 不可用时回退"无法预览"占位', () => {
    vi.mocked(convertFileSrc).mockImplementation(() => {
      throw new Error('non-tauri')
    })
    renderWithTheme(<PreviewDialog files={[mkFile('a.jpg')]} initialIndex={0} onClose={vi.fn()} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('无法预览此格式')).toBeInTheDocument()
  })

  it('点击关闭按钮触发 onClose', () => {
    vi.mocked(convertFileSrc).mockReturnValue('http://asset.localhost/a')
    const onClose = vi.fn()
    renderWithTheme(<PreviewDialog files={[mkFile('a.jpg')]} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
