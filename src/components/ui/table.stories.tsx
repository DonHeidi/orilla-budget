import type { Meta, StoryObj } from '@storybook/react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from './table'
import { Badge } from './badge'
import { Checkbox } from './checkbox'
import { Button } from './button'

const meta = {
  title: 'UI/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>john@example.com</TableCell>
          <TableCell>Developer</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>jane@example.com</TableCell>
          <TableCell>Designer</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Bob Johnson</TableCell>
          <TableCell>bob@example.com</TableCell>
          <TableCell>Manager</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>A list of recent team members</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>john@example.com</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>jane@example.com</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Laptop</TableCell>
          <TableCell className="text-right">2</TableCell>
          <TableCell className="text-right">$2,000.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Mouse</TableCell>
          <TableCell className="text-right">5</TableCell>
          <TableCell className="text-right">$125.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Keyboard</TableCell>
          <TableCell className="text-right">3</TableCell>
          <TableCell className="text-right">$450.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right">$2,575.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

export const WithSelection: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>
            <Checkbox />
          </TableCell>
          <TableCell>John Doe</TableCell>
          <TableCell>
            <Badge variant="default">Active</Badge>
          </TableCell>
          <TableCell>john@example.com</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Checkbox />
          </TableCell>
          <TableCell>Jane Smith</TableCell>
          <TableCell>
            <Badge variant="secondary">Pending</Badge>
          </TableCell>
          <TableCell>jane@example.com</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Checkbox />
          </TableCell>
          <TableCell>Bob Johnson</TableCell>
          <TableCell>
            <Badge variant="destructive">Inactive</Badge>
          </TableCell>
          <TableCell>bob@example.com</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const TimeEntriesTable: Story = {
  name: 'Real-world: Time Entries',
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Project</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="cursor-pointer">
          <TableCell>2025-11-08</TableCell>
          <TableCell className="font-medium">Client Meeting</TableCell>
          <TableCell>Website Redesign</TableCell>
          <TableCell className="text-right">2:30</TableCell>
          <TableCell className="text-center">
            <span className="inline-flex items-center text-green-600">✓</span>
          </TableCell>
        </TableRow>
        <TableRow className="cursor-pointer">
          <TableCell>2025-11-08</TableCell>
          <TableCell className="font-medium">Code Review</TableCell>
          <TableCell>Mobile App</TableCell>
          <TableCell className="text-right">1:45</TableCell>
          <TableCell className="text-center">
            <span className="inline-flex items-center text-green-600">✓</span>
          </TableCell>
        </TableRow>
        <TableRow className="cursor-pointer">
          <TableCell>2025-11-07</TableCell>
          <TableCell className="font-medium">Documentation</TableCell>
          <TableCell>API Integration</TableCell>
          <TableCell className="text-right">3:00</TableCell>
          <TableCell className="text-center">
            <span className="inline-flex items-center text-gray-300">✗</span>
          </TableCell>
        </TableRow>
        <TableRow className="cursor-pointer">
          <TableCell>2025-11-07</TableCell>
          <TableCell className="font-medium">Bug Fixes</TableCell>
          <TableCell>Website Redesign</TableCell>
          <TableCell className="text-right">4:15</TableCell>
          <TableCell className="text-center">
            <span className="inline-flex items-center text-green-600">✓</span>
          </TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total Hours</TableCell>
          <TableCell className="text-right">11:30</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

export const ProjectsTable: Story = {
  name: 'Real-world: Projects with Budget',
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">Used</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="cursor-pointer">
          <TableCell className="font-medium">Website Redesign</TableCell>
          <TableCell>
            <Badge variant="default">Budget</Badge>
          </TableCell>
          <TableCell className="text-right">80.0h</TableCell>
          <TableCell className="text-right">45.5h</TableCell>
          <TableCell className="text-right">34.5h</TableCell>
          <TableCell className="text-right">
            <Button size="sm" variant="ghost">
              View
            </Button>
          </TableCell>
        </TableRow>
        <TableRow className="cursor-pointer">
          <TableCell className="font-medium">Mobile App Development</TableCell>
          <TableCell>
            <Badge variant="secondary">Fixed Price</Badge>
          </TableCell>
          <TableCell className="text-right">120.0h</TableCell>
          <TableCell className="text-right">85.0h</TableCell>
          <TableCell className="text-right">35.0h</TableCell>
          <TableCell className="text-right">
            <Button size="sm" variant="ghost">
              View
            </Button>
          </TableCell>
        </TableRow>
        <TableRow className="cursor-pointer">
          <TableCell className="font-medium">API Integration</TableCell>
          <TableCell>
            <Badge variant="default">Budget</Badge>
          </TableCell>
          <TableCell className="text-right">40.0h</TableCell>
          <TableCell className="text-right">12.5h</TableCell>
          <TableCell className="text-right">27.5h</TableCell>
          <TableCell className="text-right">
            <Button size="sm" variant="ghost">
              View
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right">240.0h</TableCell>
          <TableCell className="text-right">143.0h</TableCell>
          <TableCell className="text-right">97.0h</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

export const OrganisationsTable: Story = {
  name: 'Real-world: Organisations',
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Organisation</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Active Projects</TableHead>
          <TableHead className="text-right">Total Hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="cursor-pointer">
          <TableCell className="font-medium">Acme Corporation</TableCell>
          <TableCell>John Doe</TableCell>
          <TableCell>john@acme.com</TableCell>
          <TableCell className="text-right">3</TableCell>
          <TableCell className="text-right">145.5h</TableCell>
        </TableRow>
        <TableRow className="cursor-pointer">
          <TableCell className="font-medium">TechStart Inc.</TableCell>
          <TableCell>Jane Smith</TableCell>
          <TableCell>jane@techstart.com</TableCell>
          <TableCell className="text-right">2</TableCell>
          <TableCell className="text-right">87.0h</TableCell>
        </TableRow>
        <TableRow className="cursor-pointer">
          <TableCell className="font-medium">Global Solutions</TableCell>
          <TableCell>Bob Johnson</TableCell>
          <TableCell>bob@global.com</TableCell>
          <TableCell className="text-right">5</TableCell>
          <TableCell className="text-right">234.5h</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

export const EmptyState: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Project</TableHead>
          <TableHead className="text-right">Hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            <div className="text-muted-foreground">
              <p className="text-sm">No time entries found</p>
              <Button size="sm" className="mt-2">
                Add Time Entry
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}
