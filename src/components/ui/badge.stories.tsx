import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'default',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
}

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
}

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
}

export const ProjectCategories: Story = {
  name: 'Real-world: Project Categories',
  render: () => (
    <div className="flex gap-2 items-center">
      <span className="text-sm">Project type:</span>
      <Badge variant="default">Budget</Badge>
      <Badge variant="secondary">Fixed Price</Badge>
    </div>
  ),
}

export const StatusIndicators: Story = {
  name: 'Real-world: Status Indicators',
  render: () => (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <span className="text-sm w-24">Draft:</span>
        <Badge variant="secondary">Draft</Badge>
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-sm w-24">Submitted:</span>
        <Badge variant="outline">Submitted</Badge>
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-sm w-24">Approved:</span>
        <Badge variant="default">Approved</Badge>
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-sm w-24">Rejected:</span>
        <Badge variant="destructive">Rejected</Badge>
      </div>
    </div>
  ),
}

export const InTableContext: Story = {
  name: 'Real-world: In Table',
  render: () => (
    <div className="w-full max-w-2xl">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Project</th>
            <th className="text-left p-2">Category</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2">Website Redesign</td>
            <td className="p-2">
              <Badge variant="default">Budget</Badge>
            </td>
            <td className="p-2">
              <Badge variant="outline">Active</Badge>
            </td>
          </tr>
          <tr className="border-b">
            <td className="p-2">Mobile App Development</td>
            <td className="p-2">
              <Badge variant="secondary">Fixed Price</Badge>
            </td>
            <td className="p-2">
              <Badge variant="default">Approved</Badge>
            </td>
          </tr>
          <tr>
            <td className="p-2">Legacy System Migration</td>
            <td className="p-2">
              <Badge variant="default">Budget</Badge>
            </td>
            <td className="p-2">
              <Badge variant="destructive">On Hold</Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
}
