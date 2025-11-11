import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './checkbox'
import { useState } from 'react'

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    checked: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    id: 'checkbox',
  },
}

export const Checked: Story = {
  args: {
    id: 'checkbox-checked',
    defaultChecked: true,
  },
}

export const Disabled: Story = {
  args: {
    id: 'checkbox-disabled',
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    id: 'checkbox-disabled-checked',
    disabled: true,
    defaultChecked: true,
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </label>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="interactive"
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
          />
          <label htmlFor="interactive" className="text-sm font-medium">
            Toggle me
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Status: {checked ? 'Checked' : 'Unchecked'}
        </p>
      </div>
    )
  },
}

export const FormExample: Story = {
  name: 'Real-world: Form Options',
  render: () => {
    const [preferences, setPreferences] = useState({
      marketing: false,
      social: false,
      security: true,
    })

    return (
      <div className="w-80 space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-3">Email Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(value) =>
                  setPreferences({ ...preferences, marketing: value === true })
                }
              />
              <label htmlFor="marketing" className="text-sm">
                Marketing emails
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="social"
                checked={preferences.social}
                onCheckedChange={(value) =>
                  setPreferences({ ...preferences, social: value === true })
                }
              />
              <label htmlFor="social" className="text-sm">
                Social updates
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="security"
                checked={preferences.security}
                onCheckedChange={(value) =>
                  setPreferences({ ...preferences, security: value === true })
                }
              />
              <label htmlFor="security" className="text-sm">
                Security alerts (required)
              </label>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {Object.values(preferences).filter(Boolean).length} of 3 selected
          </p>
        </div>
      </div>
    )
  },
}

export const TimeSheetSelection: Story = {
  name: 'Real-world: Time Sheet Entry Selection',
  render: () => {
    const [selected, setSelected] = useState<string[]>([])

    const entries = [
      { id: '1', title: 'Client Meeting', hours: 2.0, date: '2025-11-08' },
      { id: '2', title: 'Code Review', hours: 1.5, date: '2025-11-08' },
      { id: '3', title: 'Documentation', hours: 3.0, date: '2025-11-07' },
      { id: '4', title: 'Bug Fixes', hours: 4.0, date: '2025-11-07' },
    ]

    const toggleEntry = (id: string) => {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      )
    }

    const toggleAll = () => {
      setSelected((prev) =>
        prev.length === entries.length ? [] : entries.map((e) => e.id)
      )
    }

    return (
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {selected.length} of {entries.length} entries selected
          </h3>
          <button
            onClick={toggleAll}
            className="text-sm text-primary hover:underline"
          >
            {selected.length === entries.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="w-12 p-2">
                  <Checkbox
                    checked={selected.length === entries.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Date</th>
                <th className="text-right p-2">Hours</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="p-2">
                    <Checkbox
                      checked={selected.includes(entry.id)}
                      onCheckedChange={() => toggleEntry(entry.id)}
                    />
                  </td>
                  <td className="p-2">{entry.title}</td>
                  <td className="p-2">{entry.date}</td>
                  <td className="p-2 text-right">{entry.hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
}
