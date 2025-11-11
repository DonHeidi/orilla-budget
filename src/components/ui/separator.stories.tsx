import type { Meta, StoryObj } from '@storybook/react'
import { Separator } from './separator'

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    decorative: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
  render: (args) => (
    <div className="w-64">
      <Separator {...args} />
    </div>
  ),
}

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: (args) => (
    <div className="h-32 flex items-center">
      <Separator {...args} />
    </div>
  ),
}

export const InContent: Story = {
  render: () => (
    <div className="w-96 space-y-1">
      <h4 className="text-sm font-medium">Radix Primitives</h4>
      <p className="text-sm text-muted-foreground">
        An open-source UI component library.
      </p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
}

export const SidebarDivider: Story = {
  name: 'Real-world: Sidebar Menu Sections',
  render: () => (
    <div className="w-64 bg-sidebar border rounded-lg p-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-sidebar-foreground">
          Dashboard
        </div>
        <div className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
          Overview
        </div>
        <div className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
          Analytics
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-1">
        <div className="text-sm font-medium text-sidebar-foreground">
          Management
        </div>
        <div className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
          Time Entries
        </div>
        <div className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
          Projects
        </div>
        <div className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
          Organisations
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-1">
        <div className="text-sm font-medium text-sidebar-foreground">
          Settings
        </div>
        <div className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
          Profile
        </div>
        <div className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer">
          Preferences
        </div>
      </div>
    </div>
  ),
}

export const HeaderDivider: Story = {
  name: 'Real-world: Header with Vertical Separators',
  render: () => (
    <div className="w-full border rounded-lg">
      <div className="flex h-16 items-center gap-4 px-6">
        <h1 className="text-lg font-semibold">Agent Dashboard</h1>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Organisation:</span>
          <span className="font-medium text-foreground">Acme Corp</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Budget:</span>
          <span className="font-medium text-foreground">120/200h</span>
        </div>
      </div>
    </div>
  ),
}

export const FormSections: Story = {
  name: 'Real-world: Form Section Dividers',
  render: () => (
    <div className="w-96 space-y-6 border rounded-lg p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personal Information</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Full Name</label>
          <input
            type="text"
            className="w-full h-9 rounded-md border px-3"
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full h-9 rounded-md border px-3"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact Details</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <input
            type="tel"
            className="w-full h-9 rounded-md border px-3"
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <textarea
            className="w-full min-h-20 rounded-md border px-3 py-2"
            placeholder="123 Main St"
          />
        </div>
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <button className="px-4 py-2 text-sm border rounded-md">Cancel</button>
        <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md">
          Save
        </button>
      </div>
    </div>
  ),
}

export const ListDividers: Story = {
  name: 'Real-world: List Items',
  render: () => (
    <div className="w-80 border rounded-lg">
      <div className="p-4">
        <div className="font-medium">Recent Activity</div>
      </div>
      <Separator />
      <div className="p-4 text-sm">
        <div>Added time entry for Client Meeting</div>
        <div className="text-xs text-muted-foreground mt-1">2 hours ago</div>
      </div>
      <Separator />
      <div className="p-4 text-sm">
        <div>Created new project: Website Redesign</div>
        <div className="text-xs text-muted-foreground mt-1">5 hours ago</div>
      </div>
      <Separator />
      <div className="p-4 text-sm">
        <div>Updated organisation: Acme Corp</div>
        <div className="text-xs text-muted-foreground mt-1">1 day ago</div>
      </div>
    </div>
  ),
}
