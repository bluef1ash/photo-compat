import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../test-utils'
import { Button } from '../components/Button'

describe('Button', () => {
  it('渲染 children', () => {
    renderWithTheme(<Button>开始处理</Button>)
    expect(screen.getByRole('button', { name: '开始处理' })).toBeInTheDocument()
  })

  it('点击触发 onClick', async () => {
    const onClick = vi.fn()
    renderWithTheme(<Button onClick={onClick}>点我</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled 时不触发 onClick', () => {
    const onClick = vi.fn()
    renderWithTheme(
      <Button disabled onClick={onClick}>
        禁用
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    // MUI disabled 设 pointer-events:none,userEvent 会拒绝交互;用 fireEvent 验证不触发
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('默认 variant=secondary 正常渲染', () => {
    renderWithTheme(<Button>默认</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('各 variant/size 组合均正常渲染', () => {
    for (const variant of ['primary', 'secondary', 'subtle', 'destructive'] as const) {
      for (const size of ['standard', 'large', 'compact'] as const) {
        const { unmount } = renderWithTheme(
          <Button variant={variant} size={size}>
            {variant}
          </Button>,
        )
        expect(screen.getByRole('button')).toBeInTheDocument()
        unmount()
      }
    }
  })
})
