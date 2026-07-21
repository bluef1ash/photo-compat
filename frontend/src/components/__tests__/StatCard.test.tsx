import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../../test-utils'
import { StatCard } from '../StatCard'

describe('StatCard', () => {
  it('渲染 value 与 label', () => {
    renderWithTheme(<StatCard value={42} label="总图片数" />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('总图片数')).toBeInTheDocument()
  })

  it('接受字符串 value', () => {
    renderWithTheme(<StatCard value="—" label="预计输出大小" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('默认 tone=default 正常渲染', () => {
    renderWithTheme(<StatCard value={1} label="x" />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('tone=error/skip 不抛错', () => {
    renderWithTheme(
      <>
        <StatCard value={1} label="失败" tone="error" />
        <StatCard value={2} label="跳过" tone="skip" />
      </>,
    )
    expect(screen.getByText('失败')).toBeInTheDocument()
    expect(screen.getByText('跳过')).toBeInTheDocument()
  })
})
