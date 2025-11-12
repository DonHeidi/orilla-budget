import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import { Skeleton } from './skeleton'

describe('Skeleton', () => {
  describe('Rendering', () => {
    it('renders skeleton', () => {
      const { container } = render(<Skeleton />)
      const skeleton = container.firstChild
      expect(skeleton).toBeInTheDocument()
    })

    it('renders with test id', () => {
      render(<Skeleton data-testid="test-skeleton" />)
      expect(screen.getByTestId('test-skeleton')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      const { container } = render(<Skeleton className="custom-skeleton" />)
      const skeleton = container.firstChild
      expect(skeleton).toHaveClass('custom-skeleton')
    })

    it('applies width style', () => {
      const { container } = render(<Skeleton style={{ width: '200px' }} />)
      const skeleton = container.firstChild as HTMLElement
      expect(skeleton.style.width).toBe('200px')
    })

    it('applies height style', () => {
      const { container } = render(<Skeleton style={{ height: '20px' }} />)
      const skeleton = container.firstChild as HTMLElement
      expect(skeleton.style.height).toBe('20px')
    })

    it('applies border radius', () => {
      const { container } = render(<Skeleton className="rounded-full" />)
      const skeleton = container.firstChild
      expect(skeleton).toHaveClass('rounded-full')
    })
  })

  describe('Use Cases', () => {
    it('renders as text skeleton', () => {
      const { container } = render(
        <Skeleton className="h-4 w-[250px]" data-testid="text-skeleton" />
      )
      expect(screen.getByTestId('text-skeleton')).toBeInTheDocument()
    })

    it('renders as avatar skeleton', () => {
      const { container } = render(
        <Skeleton
          className="h-12 w-12 rounded-full"
          data-testid="avatar-skeleton"
        />
      )
      const skeleton = screen.getByTestId('avatar-skeleton')
      expect(skeleton).toHaveClass('rounded-full')
    })

    it('renders as card skeleton', () => {
      render(
        <div className="space-y-2" data-testid="card-skeleton">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      )
      expect(screen.getByTestId('card-skeleton')).toBeInTheDocument()
    })

    it('renders multiple skeletons for list', () => {
      const { container } = render(
        <div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      )
      const skeletons = container.querySelectorAll('[class*="h-4"]')
      expect(skeletons).toHaveLength(3)
    })
  })

  describe('Accessibility', () => {
    it('has appropriate role for loading state', () => {
      render(<Skeleton aria-label="Loading..." />)
      const skeleton = screen.getByLabelText('Loading...')
      expect(skeleton).toBeInTheDocument()
    })

    it('can have aria-busy attribute', () => {
      const { container } = render(<Skeleton aria-busy="true" />)
      const skeleton = container.firstChild
      expect(skeleton).toHaveAttribute('aria-busy', 'true')
    })
  })
})
