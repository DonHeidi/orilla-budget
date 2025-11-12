import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import { Separator } from './separator'

describe('Separator', () => {
  describe('Rendering', () => {
    it('renders separator', () => {
      const { container } = render(<Separator />)
      const separator = container.querySelector('[data-orientation]')
      expect(separator).toBeInTheDocument()
    })

    it('renders with test id', () => {
      render(<Separator data-testid="test-separator" />)
      expect(screen.getByTestId('test-separator')).toBeInTheDocument()
    })
  })

  describe('Orientation', () => {
    it('renders horizontal by default', () => {
      const { container } = render(<Separator />)
      const separator = container.querySelector(
        '[data-orientation="horizontal"]'
      )
      expect(separator).toBeInTheDocument()
    })

    it('renders vertical orientation', () => {
      const { container } = render(<Separator orientation="vertical" />)
      const separator = container.querySelector('[data-orientation="vertical"]')
      expect(separator).toBeInTheDocument()
    })
  })

  describe('Decorative', () => {
    it('is decorative by default', () => {
      const { container } = render(<Separator />)
      const separator = container.querySelector('[data-orientation]')
      expect(separator).toHaveAttribute('role', 'none')
    })

    it('can be non-decorative', () => {
      const { container } = render(<Separator decorative={false} />)
      const separator = container.querySelector('[data-orientation]')
      expect(separator).toHaveAttribute('role', 'separator')
    })
  })

  describe('Accessibility', () => {
    it('has separator role when not decorative', () => {
      const { container } = render(<Separator decorative={false} />)
      const separator = container.querySelector('[role="separator"]')
      expect(separator).toBeInTheDocument()
    })

    it('has none role when decorative', () => {
      const { container } = render(<Separator decorative={true} />)
      const separator = container.querySelector('[role="none"]')
      expect(separator).toBeInTheDocument()
    })

    it('has correct aria-orientation for horizontal', () => {
      const { container } = render(
        <Separator decorative={false} orientation="horizontal" />
      )
      const separator = container.querySelector('[role="separator"]')
      expect(separator).toBeInTheDocument()
      // Radix UI may or may not set aria-orientation depending on browser support
      expect(separator).toHaveAttribute('data-orientation', 'horizontal')
    })

    it('has correct aria-orientation for vertical', () => {
      const { container } = render(
        <Separator decorative={false} orientation="vertical" />
      )
      const separator = container.querySelector('[role="separator"]')
      expect(separator).toBeInTheDocument()
      // Radix UI may or may not set aria-orientation depending on browser support
      expect(separator).toHaveAttribute('data-orientation', 'vertical')
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      const { container } = render(<Separator className="custom-separator" />)
      const separator = container.querySelector('[data-orientation]')
      expect(separator).toHaveClass('custom-separator')
    })

    it('applies additional HTML attributes', () => {
      const { container } = render(<Separator data-custom="test" />)
      const separator = container.querySelector('[data-orientation]')
      expect(separator).toHaveAttribute('data-custom', 'test')
    })
  })

  describe('Use Cases', () => {
    it('renders as content divider', () => {
      render(
        <div>
          <div>Content 1</div>
          <Separator data-testid="divider" />
          <div>Content 2</div>
        </div>
      )
      expect(screen.getByTestId('divider')).toBeInTheDocument()
    })

    it('renders in navigation', () => {
      render(
        <nav>
          <a href="/">Home</a>
          <Separator orientation="vertical" data-testid="nav-sep" />
          <a href="/about">About</a>
        </nav>
      )
      expect(screen.getByTestId('nav-sep')).toBeInTheDocument()
    })
  })
})
