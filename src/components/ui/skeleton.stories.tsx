import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton } from './skeleton'

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Skeleton className="h-12 w-64" />,
}

export const Shapes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Rectangle</p>
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Square</p>
        <Skeleton className="h-24 w-24" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Circle</p>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Text Line</p>
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  ),
}

export const Card: Story = {
  name: 'Real-world: Card Loading',
  render: () => (
    <div className="w-96 border rounded-lg p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
}

export const TableLoading: Story = {
  name: 'Real-world: Table Loading',
  render: () => (
    <div className="w-full border rounded-lg overflow-hidden">
      <div className="bg-muted/50 border-b">
        <div className="flex gap-4 p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="divide-y">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 p-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  ),
}

export const TimeEntryList: Story = {
  name: 'Real-world: Time Entry List Loading',
  render: () => (
    <div className="w-full space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  ),
}

export const ProjectCard: Story = {
  name: 'Real-world: Project Card Loading',
  render: () => (
    <div className="w-96 border rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4 pt-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  ),
}

export const SidebarLoading: Story = {
  name: 'Real-world: Sidebar Loading',
  render: () => (
    <div className="w-64 border rounded-lg p-4 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2 pl-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2 pl-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2 pl-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  ),
}

export const FormLoading: Story = {
  name: 'Real-world: Form Loading',
  render: () => (
    <div className="w-96 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex gap-2 justify-end pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  ),
}

export const DashboardStats: Story = {
  name: 'Real-world: Dashboard Stats Loading',
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border rounded-lg p-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  ),
}

export const UserProfile: Story = {
  name: 'Real-world: User Profile Loading',
  render: () => (
    <div className="w-96 border rounded-lg p-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  ),
}

export const TimeSheetDialog: Story = {
  name: 'Real-world: Time Sheet Dialog Loading',
  render: () => (
    <div className="w-[600px] space-y-4">
      <div className="space-y-2 pb-4 border-b">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="border rounded-lg">
          <div className="bg-muted/50 border-b p-3">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="divide-y">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 p-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  ),
}
