import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog'
import { Button } from './button'

describe('Dialog', () => {
  describe('Rendering', () => {
    it('renders dialog trigger', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>Dialog content</DialogContent>
        </Dialog>
      )
      expect(screen.getByText('Open Dialog')).toBeInTheDocument()
    })

    it('renders dialog trigger as child component', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      )
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('does not render content initially', () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Dialog content</DialogContent>
        </Dialog>
      )
      expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
    })
  })

  describe('Open/Close Behavior', () => {
    it('opens dialog when trigger is clicked', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog content</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open Dialog'))

      await waitFor(() => {
        expect(screen.getByText('Dialog content')).toBeInTheDocument()
      })
    })

    it('closes dialog with close button', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
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

    it('closes dialog with DialogClose component', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
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
        <Dialog open={false}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      expect(screen.queryByText('Content')).not.toBeInTheDocument()

      rerender(
        <Dialog open={true}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('calls onOpenChange when dialog state changes', async () => {
      const handleOpenChange = vi.fn()
      const { user } = render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      expect(handleOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Content Structure', () => {
    it('renders dialog header', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
      })
    })

    it('renders dialog footer', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter>
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
      })
    })

    it('renders dialog title', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>My Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('My Dialog Title')).toBeInTheDocument()
      })
    })

    it('renders dialog description', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>This is a description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('This is a description')).toBeInTheDocument()
      })
    })

    it('renders complete dialog structure', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete your account?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button variant="destructive">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeInTheDocument()
        expect(
          screen.getByText('Are you sure you want to delete your account?')
        ).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })
    })
  })

  describe('Close Button', () => {
    it('renders close button by default', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /close/i })
        ).toBeInTheDocument()
      })
    })

    it('can hide close button', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument()
      })
      expect(
        screen.queryByRole('button', { name: /close/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has dialog role when open', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('has accessible close button', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i })
        expect(closeButton).toBeInTheDocument()
      })
    })

    it('supports keyboard escape to close', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
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
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent className="custom-dialog">
            <DialogTitle>Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveClass('custom-dialog')
      })
    })

    it('accepts custom className on header', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header" data-testid="header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('header')).toHaveClass('custom-header')
      })
    })

    it('accepts custom className on footer', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter className="custom-footer" data-testid="footer">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open'))
      await waitFor(() => {
        expect(screen.getByTestId('footer')).toHaveClass('custom-footer')
      })
    })
  })

  describe('Use Cases', () => {
    it('works as confirmation dialog', async () => {
      const handleConfirm = vi.fn()
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={handleConfirm}>
                  Confirm
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByRole('button', { name: /delete/i }))
      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /confirm/i }))
      expect(handleConfirm).toHaveBeenCalled()
    })

    it('works as form dialog', async () => {
      const handleSubmit = vi.fn()
      const { user } = render(
        <Dialog>
          <DialogTrigger>Add User</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New User</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
            >
              <input type="text" placeholder="Name" />
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Add User'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Save'))
      expect(handleSubmit).toHaveBeenCalled()
    })
  })
})
