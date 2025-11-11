import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command'
import { Calendar, Settings, User, CreditCard, Mail, MessageSquare } from 'lucide-react'
import { Button } from './button'

const meta = {
  title: 'UI/Command',
  component: Command,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <Calendar />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem>
            <User />
            <span>Search Users</span>
          </CommandItem>
          <CommandItem>
            <Settings />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <User />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <CreditCard />
            <span>Billing</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Settings />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const WithShortcuts: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem>
            <Mail />
            <span>New Email</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <MessageSquare />
            <span>New Message</span>
            <CommandShortcut>⌘M</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Calendar />
            <span>New Event</span>
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const Dialog: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <>
        <p className="text-sm text-muted-foreground mb-4">
          Press the button to open the command dialog
        </p>
        <Button onClick={() => setOpen(true)}>Open Command Dialog</Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <Calendar />
                <span>Calendar</span>
              </CommandItem>
              <CommandItem>
                <User />
                <span>Search Users</span>
              </CommandItem>
              <CommandItem>
                <Settings />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem>
                <User />
                <span>Profile</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <CreditCard />
                <span>Billing</span>
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <Settings />
                <span>Settings</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    )
  },
}

export const EmptyState: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="Search for something..." />
      <CommandList>
        <CommandEmpty>No results found. Try searching for something else.</CommandEmpty>
      </CommandList>
    </Command>
  ),
}
