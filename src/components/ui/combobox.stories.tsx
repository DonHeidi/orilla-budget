import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Combobox } from './combobox'

const meta = {
  title: 'UI/Combobox',
  component: Combobox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
    },
    searchPlaceholder: {
      control: 'text',
    },
    emptyText: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

const frameworks = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid' },
]

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
  { value: 'grape', label: 'Grape' },
]

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <Combobox
        options={frameworks}
        value={value}
        onChange={setValue}
        placeholder="Select framework..."
        searchPlaceholder="Search frameworks..."
      />
    )
  },
}

export const WithPreselectedValue: Story = {
  render: () => {
    const [value, setValue] = useState('react')
    return (
      <Combobox
        options={frameworks}
        value={value}
        onChange={setValue}
        placeholder="Select framework..."
        searchPlaceholder="Search frameworks..."
      />
    )
  },
}

export const LongList: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <Combobox
        options={fruits}
        value={value}
        onChange={setValue}
        placeholder="Select fruit..."
        searchPlaceholder="Search fruits..."
        emptyText="No fruit found."
      />
    )
  },
}

export const CustomWidth: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <Combobox
        options={frameworks}
        value={value}
        onChange={setValue}
        placeholder="Select framework..."
        searchPlaceholder="Search frameworks..."
        className="w-[300px]"
      />
    )
  },
}
