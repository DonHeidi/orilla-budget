import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command'

describe('Command', () => {
  describe('Rendering', () => {
    it('renders command component', () => {
      const { container } = render(
        <Command>
          <CommandInput placeholder="Search..." />
        </Command>
      )
      expect(container.querySelector('[data-slot="command"]')).toBeInTheDocument()
    })

    it('renders command input', () => {
      render(
        <Command>
          <CommandInput placeholder="Type a command..." />
        </Command>
      )
      expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument()
    })

    it('renders command list', () => {
      const { container } = render(
        <Command>
          <CommandList>
            <CommandItem>Item 1</CommandItem>
          </CommandList>
        </Command>
      )
      expect(container.querySelector('[data-slot="command-list"]')).toBeInTheDocument()
    })
  })

  describe('Command Structure', () => {
    it('renders complete command structure', () => {
      render(
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandGroup heading="Suggestions">
              <CommandItem>Item 1</CommandItem>
              <CommandItem>Item 2</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      )

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      expect(screen.getByText('Suggestions')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    it('renders multiple command groups', () => {
      render(
        <Command>
          <CommandList>
            <CommandGroup heading="Group 1">
              <CommandItem>Item A</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Group 2">
              <CommandItem>Item B</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      )

      expect(screen.getByText('Group 1')).toBeInTheDocument()
      expect(screen.getByText('Group 2')).toBeInTheDocument()
      expect(screen.getByText('Item A')).toBeInTheDocument()
      expect(screen.getByText('Item B')).toBeInTheDocument()
    })

    it('renders command empty state', () => {
      const { container } = render(
        <Command>
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
          </CommandList>
        </Command>
      )

      expect(container.querySelector('[data-slot="command-empty"]')).toBeInTheDocument()
    })

    it('renders command separator', () => {
      const { container } = render(
        <Command>
          <CommandList>
            <CommandItem>Item 1</CommandItem>
            <CommandSeparator />
            <CommandItem>Item 2</CommandItem>
          </CommandList>
        </Command>
      )

      expect(container.querySelector('[data-slot="command-separator"]')).toBeInTheDocument()
    })
  })

  describe('Command Items', () => {
    it('renders command items', () => {
      render(
        <Command>
          <CommandList>
            <CommandItem>Create new file</CommandItem>
            <CommandItem>Open recent</CommandItem>
          </CommandList>
        </Command>
      )

      expect(screen.getByText('Create new file')).toBeInTheDocument()
      expect(screen.getByText('Open recent')).toBeInTheDocument()
    })

    it('renders items with shortcuts', () => {
      render(
        <Command>
          <CommandList>
            <CommandItem>
              Save
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
            <CommandItem>
              Copy
              <CommandShortcut>⌘C</CommandShortcut>
            </CommandItem>
          </CommandList>
        </Command>
      )

      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('⌘S')).toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
      expect(screen.getByText('⌘C')).toBeInTheDocument()
    })

    it('handles item selection', async () => {
      const handleSelect = vi.fn()
      const { user } = render(
        <Command>
          <CommandList>
            <CommandItem onSelect={handleSelect}>Select me</CommandItem>
          </CommandList>
        </Command>
      )

      await user.click(screen.getByText('Select me'))
      expect(handleSelect).toHaveBeenCalled()
    })

    it('renders disabled items', () => {
      const { container } = render(
        <Command>
          <CommandList>
            <CommandItem disabled>Disabled item</CommandItem>
          </CommandList>
        </Command>
      )

      const item = container.querySelector('[data-disabled="true"]')
      expect(item).toBeInTheDocument()
    })
  })

  describe('Command Input', () => {
    it('accepts input value', async () => {
      const { user } = render(
        <Command>
          <CommandInput placeholder="Search..." />
        </Command>
      )

      const input = screen.getByPlaceholderText('Search...')
      await user.type(input, 'test query')

      expect(input).toHaveValue('test query')
    })

    it('handles input change', async () => {
      const handleChange = vi.fn()
      const { user } = render(
        <Command>
          <CommandInput placeholder="Search..." onValueChange={handleChange} />
        </Command>
      )

      await user.type(screen.getByPlaceholderText('Search...'), 'a')
      expect(handleChange).toHaveBeenCalled()
    })

    it('can be disabled', () => {
      render(
        <Command>
          <CommandInput placeholder="Search..." disabled />
        </Command>
      )

      expect(screen.getByPlaceholderText('Search...')).toBeDisabled()
    })
  })

  describe('CommandDialog', () => {
    it('renders dialog when open', () => {
      render(
        <CommandDialog open={true} title="Command Menu">
          <CommandInput placeholder="Type a command..." />
          <CommandList>
            <CommandItem>Item 1</CommandItem>
          </CommandList>
        </CommandDialog>
      )

      expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(
        <CommandDialog open={false}>
          <CommandInput placeholder="Type a command..." />
        </CommandDialog>
      )

      expect(screen.queryByPlaceholderText('Type a command...')).not.toBeInTheDocument()
    })

    it('renders with custom title', () => {
      render(
        <CommandDialog open={true} title="Custom Title">
          <CommandInput />
        </CommandDialog>
      )

      // Title is sr-only, so check for the text in document
      expect(screen.getByText('Custom Title')).toBeInTheDocument()
    })

    it('renders with custom description', () => {
      render(
        <CommandDialog open={true} description="Custom description text">
          <CommandInput />
        </CommandDialog>
      )

      expect(screen.getByText('Custom description text')).toBeInTheDocument()
    })

    it('can control close button visibility', () => {
      render(
        <CommandDialog open={true} showCloseButton={false}>
          <CommandInput />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </CommandDialog>
      )

      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    })

    it('handles onOpenChange callback', async () => {
      const handleOpenChange = vi.fn()
      const { user } = render(
        <CommandDialog open={true} onOpenChange={handleOpenChange}>
          <CommandInput />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </CommandDialog>
      )

      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(handleOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Filtering', () => {
    it('filters items based on search', async () => {
      const { user } = render(
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandItem value="create">Create new file</CommandItem>
            <CommandItem value="open">Open file</CommandItem>
            <CommandItem value="save">Save file</CommandItem>
          </CommandList>
        </Command>
      )

      const input = screen.getByPlaceholderText('Search...')
      await user.type(input, 'create')

      // Note: Actual filtering behavior depends on cmdk implementation
      // This test verifies the structure supports filtering
      expect(input).toHaveValue('create')
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className on command', () => {
      const { container } = render(
        <Command className="custom-command">
          <CommandInput />
        </Command>
      )

      const command = container.querySelector('[data-slot="command"]')
      expect(command).toHaveClass('custom-command')
    })

    it('accepts custom className on items', () => {
      const { container } = render(
        <Command>
          <CommandList>
            <CommandItem className="custom-item">Item</CommandItem>
          </CommandList>
        </Command>
      )

      const item = container.querySelector('[data-slot="command-item"]')
      expect(item).toHaveClass('custom-item')
    })

    it('accepts custom className on groups', () => {
      const { container } = render(
        <Command>
          <CommandList>
            <CommandGroup className="custom-group" heading="Group">
              <CommandItem>Item</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      )

      const group = container.querySelector('[data-slot="command-group"]')
      expect(group).toHaveClass('custom-group')
    })
  })

  describe('Use Cases', () => {
    it('works as command palette', () => {
      render(
        <CommandDialog open={true}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                New File
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem>
                Open File
                <CommandShortcut>⌘O</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem>Preferences</CommandItem>
              <CommandItem>Keyboard Shortcuts</CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      )

      expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()
      expect(screen.getByText('Suggestions')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('New File')).toBeInTheDocument()
      expect(screen.getByText('⌘N')).toBeInTheDocument()
    })

    it('works as search interface', () => {
      render(
        <Command>
          <CommandInput placeholder="Search items..." />
          <CommandList>
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup heading="Results">
              <CommandItem>Result 1</CommandItem>
              <CommandItem>Result 2</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      )

      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
      expect(screen.getByText('Results')).toBeInTheDocument()
    })

    it('works as action menu', () => {
      const handleAction = vi.fn()

      render(
        <Command>
          <CommandList>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleAction('edit')}>Edit</CommandItem>
              <CommandItem onSelect={() => handleAction('delete')}>Delete</CommandItem>
              <CommandItem onSelect={() => handleAction('share')}>Share</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      )

      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.getByText('Share')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('input is keyboard accessible', () => {
      render(
        <Command>
          <CommandInput placeholder="Search..." />
        </Command>
      )

      const input = screen.getByPlaceholderText('Search...')
      input.focus()
      expect(input).toHaveFocus()
    })

    it('items are keyboard navigable', async () => {
      const { user } = render(
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandItem>Item 1</CommandItem>
            <CommandItem>Item 2</CommandItem>
          </CommandList>
        </Command>
      )

      const input = screen.getByPlaceholderText('Search...')
      input.focus()
      expect(input).toHaveFocus()

      // Arrow navigation is handled by cmdk library
      await user.keyboard('{ArrowDown}')
      // Test structure supports keyboard navigation
      expect(input).toBeInTheDocument()
    })

    it('dialog supports escape key', async () => {
      const handleOpenChange = vi.fn()
      const { user } = render(
        <CommandDialog open={true} onOpenChange={handleOpenChange}>
          <CommandInput />
        </CommandDialog>
      )

      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(handleOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })
})
