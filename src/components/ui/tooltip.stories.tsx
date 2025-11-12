import type { Meta, StoryObj } from '@storybook/react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from './tooltip'
import { Button } from './button'
import { Plus, Info, HelpCircle, Settings } from 'lucide-react'

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="outline">
          <Info className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Click for more information</p>
      </TooltipContent>
    </Tooltip>
  ),
}

export const Sides: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-col gap-12">
        <div className="flex gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Top</Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Tooltip on top</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Right</Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Tooltip on right</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Bottom</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Tooltip on bottom</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Left</Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Tooltip on left</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  ),
}

export const WithDelay: Story = {
  render: () => (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me (500ms delay)</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This tooltip has a 500ms delay</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const LongContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>
          This is a longer tooltip message that demonstrates how the tooltip
          handles multiple lines of text content. The tooltip will wrap text
          automatically to fit within its constraints.
        </p>
      </TooltipContent>
    </Tooltip>
  ),
}

export const IconButtons: Story = {
  name: 'Real-world: Icon Button Hints',
  render: () => (
    <TooltipProvider>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add new item</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open settings</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View details</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Get help</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
}

export const SidebarButtons: Story = {
  name: 'Real-world: Collapsed Sidebar',
  render: () => (
    <TooltipProvider>
      <div className="w-16 bg-sidebar border rounded-lg p-2 space-y-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-full h-10 flex items-center justify-center rounded-md hover:bg-sidebar-accent">
              <span className="text-lg">📊</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Dashboard</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-full h-10 flex items-center justify-center rounded-md hover:bg-sidebar-accent">
              <span className="text-lg">⏰</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Time Entries</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-full h-10 flex items-center justify-center rounded-md hover:bg-sidebar-accent">
              <span className="text-lg">📁</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Projects</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-full h-10 flex items-center justify-center rounded-md hover:bg-sidebar-accent">
              <span className="text-lg">🏢</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Organisations</p>
          </TooltipContent>
        </Tooltip>

        <div className="border-t pt-2 mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-full h-10 flex items-center justify-center rounded-md hover:bg-sidebar-accent">
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  ),
}

export const TableActions: Story = {
  name: 'Real-world: Table Row Actions',
  render: () => (
    <TooltipProvider>
      <div className="w-full max-w-2xl border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left p-3">Project</th>
              <th className="text-left p-3">Hours</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-3">Website Redesign</td>
              <td className="p-3">24.5h</td>
              <td className="p-3">
                <div className="flex gap-1 justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon-sm" variant="ghost">
                        👁️
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View details</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon-sm" variant="ghost">
                        ✏️
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit project</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon-sm" variant="ghost">
                        🗑️
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete project</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  ),
}

export const FormHelp: Story = {
  name: 'Real-world: Form Field Help',
  render: () => (
    <TooltipProvider>
      <div className="w-96 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Budget Hours</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Total hours allocated for this project. This can be adjusted
                  later if needed.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <input
            type="number"
            className="w-full h-9 rounded-md border px-3"
            placeholder="40"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Access Code</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  A unique code that clients can use to access their project
                  information in the portal.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <input
            type="text"
            className="w-full h-9 rounded-md border px-3"
            placeholder="ABC123"
          />
        </div>
      </div>
    </TooltipProvider>
  ),
}
