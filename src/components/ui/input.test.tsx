import { describe, test, expect } from 'bun:test'
import { render } from '@testing-library/react'
import { Input } from './input'

describe('Input', () => {
  test('renders input element', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input')
    expect(input).toBeTruthy()
  })

  test('renders with placeholder', () => {
    const { container } = render(<Input placeholder="Enter text..." />)
    const input = container.querySelector('input')
    expect(input?.placeholder).toBe('Enter text...')
  })

  test('renders with value', () => {
    const { container } = render(<Input value="test value" readOnly />)
    const input = container.querySelector('input')
    expect(input?.value).toBe('test value')
  })

  test('can be disabled', () => {
    const { container } = render(<Input disabled />)
    const input = container.querySelector('input')
    expect(input?.disabled).toBe(true)
  })

  test('renders with type attribute', () => {
    const { container } = render(<Input type="email" />)
    const input = container.querySelector('input')
    expect(input?.type).toBe('email')
  })
})
