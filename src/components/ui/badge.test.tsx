import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import { Badge } from './badge'

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders with text content', () => {
      render(<Badge>New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('renders with children elements', () => {
      render(
        <Badge>
          <span data-testid="badge-icon">★</span>
          <span>Featured</span>
        </Badge>
      )
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument()
      expect(screen.getByText('Featured')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Badge variant="default">Default</Badge>)
      expect(screen.getByText('Default')).toBeInTheDocument()
    })

    it('renders secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>)
      expect(screen.getByText('Secondary')).toBeInTheDocument()
    })

    it('renders destructive variant', () => {
      render(<Badge variant="destructive">Error</Badge>)
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('renders outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>)
      expect(screen.getByText('Outline')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>)
      const badge = screen.getByText('Custom')
      expect(badge).toHaveClass('custom-badge')
    })

    it('applies additional HTML attributes', () => {
      render(<Badge data-testid="test-badge">Test</Badge>)
      expect(screen.getByTestId('test-badge')).toBeInTheDocument()
    })
  })

  describe('Content', () => {
    it('renders numeric content', () => {
      render(<Badge>99+</Badge>)
      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('renders empty badge', () => {
      const { container } = render(<Badge />)
      const badge = container.querySelector('div')
      expect(badge).toBeInTheDocument()
      expect(badge).toBeEmptyDOMElement()
    })

    it('renders with single character', () => {
      render(<Badge>!</Badge>)
      expect(screen.getByText('!')).toBeInTheDocument()
    })

    it('renders with long text', () => {
      const longText = 'This is a very long badge text'
      render(<Badge>{longText}</Badge>)
      expect(screen.getByText(longText)).toBeInTheDocument()
    })
  })

  describe('Use Cases', () => {
    it('renders notification badge', () => {
      render(<Badge variant="destructive">5</Badge>)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders status badge', () => {
      render(<Badge variant="secondary">Active</Badge>)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders category badge', () => {
      render(<Badge variant="outline">Technology</Badge>)
      expect(screen.getByText('Technology')).toBeInTheDocument()
    })
  })
})
