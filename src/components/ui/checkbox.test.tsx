import { describe, test, expect } from 'bun:test'
import { render } from '@testing-library/react'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  test('renders checkbox', () => {
    const { container } = render(<Checkbox />)
    const checkbox = container.querySelector('button[role="checkbox"]')
    expect(checkbox).toBeTruthy()
  })

  test('renders with checked state', () => {
    const { container } = render(<Checkbox checked />)
    const checkbox = container.querySelector('button[role="checkbox"]')
    expect(checkbox?.getAttribute('data-state')).toBe('checked')
  })

  test('renders with unchecked state', () => {
    const { container } = render(<Checkbox checked={false} />)
    const checkbox = container.querySelector('button[role="checkbox"]')
    expect(checkbox?.getAttribute('data-state')).toBe('unchecked')
  })

  test('can be disabled', () => {
    const { container } = render(<Checkbox disabled />)
    const checkbox = container.querySelector('button[role="checkbox"]')
    expect(checkbox?.disabled).toBe(true)
  })
})
