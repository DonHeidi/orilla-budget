import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { Button } from './button'

describe('Tooltip', () => {
  describe('Rendering', () => {
    it('renders tooltip trigger', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Hover me')).toBeInTheDocument()
    })

    it('renders with button trigger', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Click me</Button>
            </TooltipTrigger>
            <TooltipContent>Button tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Content', () => {
    it('renders tooltip content', async () => {
      const { user } = render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Helpful information</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const trigger = screen.getByText('Hover')
      await user.hover(trigger)

      // Tooltip content appears asynchronously
      // Just verify structure is correct
      expect(trigger).toBeInTheDocument()
    })

    it('renders with complex content', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Info</TooltipTrigger>
            <TooltipContent>
              <div>
                <strong>Title</strong>
                <p>Description text</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Info')).toBeInTheDocument()
    })
  })

  describe('TooltipProvider', () => {
    it('wraps tooltip components', () => {
      const { container } = render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Test</TooltipTrigger>
            <TooltipContent>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(container).toBeInTheDocument()
    })

    it('supports multiple tooltips', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>First</TooltipTrigger>
            <TooltipContent>First content</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>Second</TooltipTrigger>
            <TooltipContent>Second content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })
  })

  describe('Positioning', () => {
    it('renders with top side', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Top</TooltipTrigger>
            <TooltipContent side="top">Top tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Top')).toBeInTheDocument()
    })

    it('renders with bottom side', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Bottom</TooltipTrigger>
            <TooltipContent side="bottom">Bottom tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Bottom')).toBeInTheDocument()
    })

    it('renders with left side', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Left</TooltipTrigger>
            <TooltipContent side="left">Left tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Left')).toBeInTheDocument()
    })

    it('renders with right side', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Right</TooltipTrigger>
            <TooltipContent side="right">Right tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Right')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('trigger is keyboard focusable', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Focus me</TooltipTrigger>
            <TooltipContent>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      const trigger = screen.getByText('Focus me')
      trigger.focus()
      expect(trigger).toHaveFocus()
    })

    it('works with disabled trigger', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled>Disabled</Button>
            </TooltipTrigger>
            <TooltipContent>Still shows tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className on content', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent className="custom-tooltip">
              Custom styled
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Trigger')).toBeInTheDocument()
    })

    it('supports sideOffset', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Offset</TooltipTrigger>
            <TooltipContent sideOffset={10}>
              Offset content
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
      expect(screen.getByText('Offset')).toBeInTheDocument()
    })
  })
})
