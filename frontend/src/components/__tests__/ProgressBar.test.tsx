import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../../test-utils'
import { ProgressBar } from '../ProgressBar'

describe('ProgressBar', () => {
  it('value 越界被钳制到 100 并写入 aria-valuenow', () => {
    renderWithTheme(<ProgressBar value={150} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('value 为负钳制到 0', () => {
    renderWithTheme(<ProgressBar value={-20} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('正常值直传', () => {
    renderWithTheme(<ProgressBar value={42} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42')
  })
})
