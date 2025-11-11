import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover'
import { Button } from './button'

describe('Popover', () => {
  describe('Rendering', () => {
    it('renders popover trigger', () => {
      render(
        <Popover>
          <PopoverTrigger>Open Popover</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      )
      expect(screen.getByText('Open Popover')).toBeInTheDocument()
    })

    it('renders popover trigger as child component', () => {
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('does not render content initially', () => {
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      )
      expect(screen.queryByText('Popover content')).not.toBeInTheDocument()
    })
  })

  describe('Open/Close Behavior', () => {
    it('opens popover when trigger is clicked', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open Popover</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open Popover'))

      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument()
      })
    })

    it('closes popover when trigger is clicked again', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Toggle</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Toggle'))
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Toggle'))
      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument()
      })
    })

    it('closes popover when clicking outside', async () => {
      const { user } = render(
        <div>
          <div data-testid="outside">Outside element</div>
          <Popover>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Popover content</PopoverContent>
          </Popover>
        </div>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('outside'))
      await waitFor(() => {
        expect(screen.queryByText('Popover content')).not.toBeInTheDocument()
      })
    })

    it('can be controlled with open prop', () => {
      const { rerender } = render(
        <Popover open={false}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      expect(screen.queryByText('Content')).not.toBeInTheDocument()

      rerender(
        <Popover open={true}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Positioning', () => {
    it('renders with default center alignment', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent data-testid="popover">Content</PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('popover')).toBeInTheDocument()
      })
    })

    it('accepts align prop', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent align="start" data-testid="popover">
            Content
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('popover')).toBeInTheDocument()
      })
    })

    it('accepts side prop', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent side="top" data-testid="popover">
            Content
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('popover')).toBeInTheDocument()
      })
    })

    it('accepts sideOffset prop', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent sideOffset={10} data-testid="popover">
            Content
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('popover')).toBeInTheDocument()
      })
    })
  })

  describe('PopoverAnchor', () => {
    it('renders with custom anchor', async () => {
      const { user } = render(
        <Popover>
          <PopoverAnchor>
            <div data-testid="anchor">Anchor element</div>
          </PopoverAnchor>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      expect(screen.getByTestId('anchor')).toBeInTheDocument()

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })
    })
  })

  describe('Content Types', () => {
    it('renders text content', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Simple text content</PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Simple text content')).toBeInTheDocument()
      })
    })

    it('renders complex content', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <div>
              <h3>Title</h3>
              <p>Description text</p>
              <Button>Action</Button>
            </div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
        expect(screen.getByText('Description text')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
      })
    })

    it('renders form content', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <form>
              <input type="text" placeholder="Username" />
              <Button type="submit">Submit</Button>
            </form>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('trigger has button role', () => {
      render(
        <Popover>
          <PopoverTrigger asChild>
            <button>Open</button>
          </PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('content is keyboard accessible', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>
            <Button>Focusable button</Button>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        const button = screen.getByText('Focusable button')
        expect(button).toBeInTheDocument()
      })

      await user.tab()
      const focusableButton = screen.getByText('Focusable button')
      expect(focusableButton).toHaveFocus()
    })

    it('supports escape key to close', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className on content', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent className="custom-popover" data-testid="popover">
            Content
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('popover')).toHaveClass('custom-popover')
      })
    })

    it('applies additional HTML attributes', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent data-custom="test" data-testid="popover">
            Content
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('popover')).toHaveAttribute('data-custom', 'test')
      })
    })
  })

  describe('Use Cases', () => {
    it('works as info popover', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost">Info</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div>
              <h4>Additional Information</h4>
              <p>This is helpful context about the feature.</p>
            </div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByRole('button', { name: 'Info' }))
      await waitFor(() => {
        expect(screen.getByText('Additional Information')).toBeInTheDocument()
        expect(screen.getByText('This is helpful context about the feature.')).toBeInTheDocument()
      })
    })

    it('works as menu popover', async () => {
      const { user } = render(
        <Popover>
          <PopoverTrigger>Options</PopoverTrigger>
          <PopoverContent>
            <div>
              <Button variant="ghost">Edit</Button>
              <Button variant="ghost">Delete</Button>
              <Button variant="ghost">Share</Button>
            </div>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Options'))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
      })
    })

    it('works as quick form popover', async () => {
      const handleSubmit = vi.fn()
      const { user } = render(
        <Popover>
          <PopoverTrigger>Quick Add</PopoverTrigger>
          <PopoverContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
              <input placeholder="Item name" />
              <Button type="submit">Add</Button>
            </form>
          </PopoverContent>
        </Popover>
      )

      await user.click(screen.getByText('Quick Add'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Item name'), 'New item')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(handleSubmit).toHaveBeenCalled()
    })
  })
})
