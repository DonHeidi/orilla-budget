import type { Meta, StoryObj } from '@storybook/react'
import { DataTable } from './DataTable'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet'

const meta = {
  title: 'Components/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

// Sample data types
type User = {
  id: string
  name: string
  email: string
  role: string
}

type TimeEntry = {
  id: string
  date: string
  title: string
  project: string
  hours: number
  approved: boolean
}

type Project = {
  id: string
  name: string
  category: 'budget' | 'fixed'
  budgetHours: number
  usedHours: number
  remainingHours: number
}

// Sample data
const sampleUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Developer' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Designer' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager' },
]

const sampleTimeEntries: TimeEntry[] = [
  { id: '1', date: '2025-11-08', title: 'Client Meeting', project: 'Website Redesign', hours: 2.5, approved: true },
  { id: '2', date: '2025-11-08', title: 'Code Review', project: 'Mobile App', hours: 1.75, approved: true },
  { id: '3', date: '2025-11-07', title: 'Documentation', project: 'API Integration', hours: 3.0, approved: false },
  { id: '4', date: '2025-11-07', title: 'Bug Fixes', project: 'Website Redesign', hours: 4.25, approved: true },
]

const sampleProjects: Project[] = [
  { id: '1', name: 'Website Redesign', category: 'budget', budgetHours: 80, usedHours: 45.5, remainingHours: 34.5 },
  { id: '2', name: 'Mobile App Development', category: 'fixed', budgetHours: 120, usedHours: 85, remainingHours: 35 },
  { id: '3', name: 'API Integration', category: 'budget', budgetHours: 40, usedHours: 12.5, remainingHours: 27.5 },
]

export const BasicExample: Story = {
  render: () => {
    const columns: ColumnDef<User>[] = [
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'role',
        header: 'Role',
      },
    ]

    return <DataTable columns={columns} data={sampleUsers} />
  },
}

export const WithRowClick: Story = {
  render: () => {
    const [clickedUser, setClickedUser] = useState<string | null>(null)

    const columns: ColumnDef<User>[] = [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'role', header: 'Role' },
    ]

    return (
      <div className="space-y-4">
        {clickedUser && (
          <div className="p-4 border rounded-lg bg-accent">
            Clicked: {clickedUser}
          </div>
        )}
        <DataTable
          columns={columns}
          data={sampleUsers}
          onRowClick={(row) => setClickedUser(row.original.name)}
        />
      </div>
    )
  },
}

export const TimeEntriesTable: Story = {
  name: 'Real-world: Time Entries',
  render: () => {
    const columns: ColumnDef<TimeEntry>[] = [
      {
        accessorKey: 'date',
        header: 'Date',
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'project',
        header: 'Project',
      },
      {
        accessorKey: 'hours',
        header: 'Hours',
        cell: ({ getValue }) => {
          const hours = getValue() as number
          const h = Math.floor(hours)
          const m = Math.round((hours - h) * 60)
          return `${h}:${m.toString().padStart(2, '0')}`
        },
      },
      {
        accessorKey: 'approved',
        header: 'Approved',
        cell: ({ getValue }) => {
          const approved = getValue() as boolean
          return (
            <div className="flex justify-center">
              {approved ? (
                <span className="text-green-600">✓</span>
              ) : (
                <span className="text-gray-300">✗</span>
              )}
            </div>
          )
        },
      },
    ]

    return <DataTable columns={columns} data={sampleTimeEntries} />
  },
}

export const ProjectsTable: Story = {
  name: 'Real-world: Projects with Budget',
  render: () => {
    const columns: ColumnDef<Project>[] = [
      {
        accessorKey: 'name',
        header: 'Project Name',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => {
          const category = getValue() as 'budget' | 'fixed'
          return (
            <Badge variant={category === 'budget' ? 'default' : 'secondary'}>
              {category === 'budget' ? 'Budget' : 'Fixed Price'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'budgetHours',
        header: 'Budget',
        cell: ({ getValue }) => `${getValue()}h`,
      },
      {
        accessorKey: 'usedHours',
        header: 'Used',
        cell: ({ getValue }) => `${getValue()}h`,
      },
      {
        accessorKey: 'remainingHours',
        header: 'Remaining',
        cell: ({ getValue }) => `${getValue()}h`,
      },
    ]

    return <DataTable columns={columns} data={sampleProjects} />
  },
}

export const WithDoubleClick: Story = {
  name: 'Real-world: With Detail Sheet',
  render: () => {
    const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
    const [sheetOpen, setSheetOpen] = useState(false)

    const columns: ColumnDef<TimeEntry>[] = [
      {
        accessorKey: 'date',
        header: 'Date',
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'project',
        header: 'Project',
      },
      {
        accessorKey: 'hours',
        header: 'Hours',
        cell: ({ getValue }) => {
          const hours = getValue() as number
          const h = Math.floor(hours)
          const m = Math.round((hours - h) * 60)
          return `${h}:${m.toString().padStart(2, '0')}`
        },
      },
    ]

    return (
      <>
        <DataTable
          columns={columns}
          data={sampleTimeEntries}
          onRowDoubleClick={(row) => {
            setSelectedEntry(row.original)
            setSheetOpen(true)
          }}
        />
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Time Entry Details</SheetTitle>
              <SheetDescription>
                View detailed information about this time entry
              </SheetDescription>
            </SheetHeader>
            {selectedEntry && (
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="text-base">{selectedEntry.title}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <p className="text-base">{selectedEntry.project}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                    <p className="text-base">{selectedEntry.date}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Hours</label>
                    <p className="text-base">{selectedEntry.hours}h</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-base">
                    {selectedEntry.approved ? (
                      <Badge variant="default">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </>
    )
  },
}

export const WithActions: Story = {
  name: 'Real-world: With Action Buttons',
  render: () => {
    const columns: ColumnDef<Project>[] = [
      {
        accessorKey: 'name',
        header: 'Project Name',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => {
          const category = getValue() as 'budget' | 'fixed'
          return (
            <Badge variant={category === 'budget' ? 'default' : 'secondary'}>
              {category === 'budget' ? 'Budget' : 'Fixed Price'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'usedHours',
        header: 'Progress',
        cell: ({ row }) => {
          const percentage = (row.original.usedHours / row.original.budgetHours) * 100
          return (
            <div className="flex items-center gap-2">
              <div className="w-24 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                alert(`View ${row.original.name}`)
              }}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                alert(`Edit ${row.original.name}`)
              }}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ]

    return <DataTable columns={columns} data={sampleProjects} />
  },
}

export const EmptyState: Story = {
  render: () => {
    const columns: ColumnDef<TimeEntry>[] = [
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'title', header: 'Title' },
      { accessorKey: 'project', header: 'Project' },
      { accessorKey: 'hours', header: 'Hours' },
    ]

    return <DataTable columns={columns} data={[]} />
  },
}

export const CustomGetRowId: Story = {
  name: 'With Custom Row ID',
  render: () => {
    const columns: ColumnDef<User>[] = [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'role', header: 'Role' },
    ]

    return (
      <DataTable
        columns={columns}
        data={sampleUsers}
        getRowId={(row) => row.id}
      />
    )
  },
}
