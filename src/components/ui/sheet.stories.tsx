import type { Meta, StoryObj } from '@storybook/react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from './sheet'
import { Button } from './button'
import { Input } from './input'
import { useState } from 'react'

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>
            This is a sheet description. You can add any content here.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <p>Sheet content goes here.</p>
        </div>
      </SheetContent>
    </Sheet>
  ),
}

export const Sides: Story = {
  render: () => (
    <div className="flex gap-2">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Right (default)</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Right Sheet</SheetTitle>
            <SheetDescription>This sheet slides in from the right.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Left</Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Left Sheet</SheetTitle>
            <SheetDescription>This sheet slides in from the left.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Top</Button>
        </SheetTrigger>
        <SheetContent side="top">
          <SheetHeader>
            <SheetTitle>Top Sheet</SheetTitle>
            <SheetDescription>This sheet slides in from the top.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Bottom Sheet</SheetTitle>
            <SheetDescription>This sheet slides in from the bottom.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Edit Profile</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input id="name" defaultValue="John Doe" />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input id="email" defaultValue="john@example.com" />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const TimeEntryDetail: Story = {
  name: 'Real-world: Time Entry Detail View',
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="w-full text-left p-3 border rounded-lg hover:bg-accent">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">Client Meeting</div>
                <div className="text-sm text-muted-foreground">2025-11-08</div>
              </div>
              <div className="text-sm">2.5h</div>
            </div>
          </button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader className="space-y-3 pb-6 border-b">
            <SheetTitle>Time Entry Details</SheetTitle>
            <SheetDescription>
              View and edit information about this time entry
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <Input defaultValue="Client Meeting" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="Discussed project requirements and timeline with the client."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <Input type="date" defaultValue="2025-11-08" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Hours</label>
                <Input type="number" step="0.5" defaultValue="2.5" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Project</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Website Redesign</option>
                <option>Mobile App</option>
                <option>API Integration</option>
              </select>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Created: Nov 8, 2025 at 10:30 AM
              </div>
            </div>
          </div>

          <SheetFooter className="border-t pt-6">
            <Button variant="destructive" onClick={() => setOpen(false)}>
              Delete
            </Button>
            <div className="flex-1" />
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  },
}

export const ClickToEdit: Story = {
  name: 'Real-world: Click-to-Edit Pattern',
  render: () => {
    const [editingField, setEditingField] = useState<string | null>(null)
    const [values, setValues] = useState({
      title: 'Project Meeting',
      description: 'Discussed the upcoming project milestones',
      hours: '3.0',
      date: '2025-11-08',
    })

    const handleFieldClick = (fieldName: string) => {
      setEditingField(fieldName)
    }

    const handleFieldBlur = () => {
      setEditingField(null)
    }

    const handleFieldChange = (fieldName: string, value: string) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }))
    }

    return (
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full text-left p-3 border rounded-lg hover:bg-accent">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{values.title}</div>
                <div className="text-sm text-muted-foreground">{values.date}</div>
              </div>
              <div className="text-sm">{values.hours}h</div>
            </div>
          </button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader className="space-y-3 pb-6 border-b">
            <SheetTitle>Click to Edit</SheetTitle>
            <SheetDescription>
              Click on any field to edit it inline
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              {editingField === 'title' ? (
                <Input
                  autoFocus
                  value={values.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={handleFieldBlur}
                />
              ) : (
                <p
                  className="text-base cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('title')}
                >
                  {values.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              {editingField === 'description' ? (
                <textarea
                  autoFocus
                  value={values.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              ) : (
                <p
                  className="text-base cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2 min-h-[80px]"
                  onClick={() => handleFieldClick('description')}
                >
                  {values.description || 'Click to add description...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                {editingField === 'date' ? (
                  <Input
                    autoFocus
                    type="date"
                    value={values.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p
                    className="text-base cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('date')}
                  >
                    {values.date}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Hours</label>
                {editingField === 'hours' ? (
                  <Input
                    autoFocus
                    type="number"
                    step="0.5"
                    value={values.hours}
                    onChange={(e) => handleFieldChange('hours', e.target.value)}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p
                    className="text-base cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('hours')}
                  >
                    {values.hours}h
                  </p>
                )}
              </div>
            </div>
          </div>

          <SheetFooter className="border-t pt-6">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  },
}

export const ProjectDetail: Story = {
  name: 'Real-world: Project Detail View',
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <button className="w-full text-left p-4 border rounded-lg hover:bg-accent">
          <div className="flex justify-between items-start mb-2">
            <div className="font-medium">Website Redesign</div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
              Budget
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Complete overhaul of the company website
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            <div>
              <span className="text-muted-foreground">Budget:</span> 80h
            </div>
            <div>
              <span className="text-muted-foreground">Used:</span> 45.5h
            </div>
            <div>
              <span className="text-muted-foreground">Remaining:</span> 34.5h
            </div>
          </div>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px]">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Project Details</SheetTitle>
          <SheetDescription>View and edit project information</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Project Name
            </label>
            <Input defaultValue="Website Redesign" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="Complete overhaul of the company website with modern design and improved UX."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Budget (Time & Materials)</option>
                <option>Fixed Price</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Budget (hours)
              </label>
              <Input type="number" step="0.5" defaultValue="80" />
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-medium">Budget Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">80.0h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Used</div>
                <div className="text-lg font-semibold">45.5h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Remaining</div>
                <div className="text-lg font-semibold">34.5h</div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: '56.875%' }}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Created: Oct 15, 2025 at 9:00 AM
            </div>
          </div>
        </div>

        <SheetFooter className="border-t pt-6">
          <Button variant="destructive">Delete Project</Button>
          <div className="flex-1" />
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}
