import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './sheet'
import { Button } from './button'

describe('Sheet', () => {
  describe('Rendering', () => {
    it('renders sheet trigger', () => {
      render(
        <Sheet>
          <SheetTrigger>Open Sheet</SheetTrigger>
          <SheetContent>Sheet content</SheetContent>
        </Sheet>
      )
      expect(screen.getByText('Open Sheet')).toBeInTheDocument()
    })

    it('renders sheet trigger as child component', () => {
      render(
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open</Button>
          </SheetTrigger>
          <SheetContent>Content</SheetContent>
        </Sheet>
      )
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('does not render content initially', () => {
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>Sheet content</SheetContent>
        </Sheet>
      )
      expect(screen.queryByText('Sheet content')).not.toBeInTheDocument()
    })
  })

  describe('Open/Close Behavior', () => {
    it('opens sheet when trigger is clicked', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open Sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet content</SheetDescription>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open Sheet'))

      await waitFor(() => {
        expect(screen.getByText('Sheet content')).toBeInTheDocument()
      })
    })

    it('closes sheet with close button', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument()
      })
    })

    it('closes sheet with SheetClose component', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
            <SheetClose asChild>
              <Button>Cancel</Button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument()
      })
    })

    it('can be controlled with open prop', () => {
      const { rerender } = render(
        <Sheet open={false}>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
      )

      expect(screen.queryByText('Content')).not.toBeInTheDocument()

      rerender(
        <Sheet open={true}>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('calls onOpenChange when sheet state changes', async () => {
      const handleOpenChange = vi.fn()
      const { user } = render(
        <Sheet onOpenChange={handleOpenChange}>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      expect(handleOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Side Variants', () => {
    it('renders from right side by default', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent data-testid="sheet">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        const sheet = screen.getByTestId('sheet')
        expect(sheet).toBeInTheDocument()
      })
    })

    it('renders from left side', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent side="left" data-testid="sheet">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toBeInTheDocument()
      })
    })

    it('renders from top side', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent side="top" data-testid="sheet">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toBeInTheDocument()
      })
    })

    it('renders from bottom side', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent side="bottom" data-testid="sheet">
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toBeInTheDocument()
      })
    })
  })

  describe('Content Structure', () => {
    it('renders sheet header', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
      })
    })

    it('renders sheet footer', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter>
              <Button>Save</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
      })
    })

    it('renders sheet title', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>My Sheet Title</SheetTitle>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('My Sheet Title')).toBeInTheDocument()
      })
    })

    it('renders sheet description', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>This is a description</SheetDescription>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('This is a description')).toBeInTheDocument()
      })
    })

    it('renders complete sheet structure', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>
                Manage your account settings and preferences
              </SheetDescription>
            </SheetHeader>
            <div>Form fields here</div>
            <SheetFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(
          screen.getByText('Manage your account settings and preferences')
        ).toBeInTheDocument()
        expect(screen.getByText('Form fields here')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Save Changes')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has dialog role when open', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('has accessible close button', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i })
        expect(closeButton).toBeInTheDocument()
      })
    })

    it('supports keyboard escape to close', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
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
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent className="custom-sheet" data-testid="sheet">
            <SheetTitle>Title</SheetTitle>
            <p>Content</p>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('sheet')).toHaveClass('custom-sheet')
      })
    })

    it('accepts custom className on header', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader className="custom-header" data-testid="header">
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('header')).toHaveClass('custom-header')
      })
    })

    it('accepts custom className on footer', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter className="custom-footer" data-testid="footer">
              <Button>Action</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('footer')).toHaveClass('custom-footer')
      })
    })
  })

  describe('Use Cases', () => {
    it('works as navigation sheet', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>Menu</SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <nav>
              <a href="/home">Home</a>
              <a href="/about">About</a>
            </nav>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Menu'))
      await waitFor(() => {
        expect(screen.getByText('Navigation')).toBeInTheDocument()
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('About')).toBeInTheDocument()
      })
    })

    it('works as settings sheet', async () => {
      const handleSave = vi.fn()
      const { user } = render(
        <Sheet>
          <SheetTrigger>Settings</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>Configure your preferences</SheetDescription>
            </SheetHeader>
            <div>Settings form</div>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
              </SheetClose>
              <Button onClick={handleSave}>Save</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('Settings'))
      await waitFor(() => {
        expect(screen.getByText('Configure your preferences')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(handleSave).toHaveBeenCalled()
    })

    it('works as detail panel', async () => {
      const { user } = render(
        <Sheet>
          <SheetTrigger>View Details</SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Item Details</SheetTitle>
            </SheetHeader>
            <div>
              <p>Name: Product X</p>
              <p>Price: $99</p>
            </div>
          </SheetContent>
        </Sheet>
      )

      await user.click(screen.getByText('View Details'))
      await waitFor(() => {
        expect(screen.getByText('Item Details')).toBeInTheDocument()
        expect(screen.getByText('Name: Product X')).toBeInTheDocument()
        expect(screen.getByText('Price: $99')).toBeInTheDocument()
      })
    })
  })
})
