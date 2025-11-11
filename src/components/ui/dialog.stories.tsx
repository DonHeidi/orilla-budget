import type { Meta, StoryObj } from '@storybook/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './dialog'
import { Button } from './button'
import { Input } from './input'
import { useState } from 'react'

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a dialog description. You can add any content here.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>Dialog content goes here.</p>
        </div>
      </DialogContent>
    </Dialog>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input id="name" defaultValue="John Doe" />
          </div>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input id="username" defaultValue="@johndoe" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const DeleteConfirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive">Delete Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Dialog is {open ? 'open' : 'closed'}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Open Controlled Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Controlled Dialog</DialogTitle>
              <DialogDescription>
                This dialog's open state is controlled externally.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p>You can control this dialog programmatically.</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
}
