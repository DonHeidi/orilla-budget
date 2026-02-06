import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import { FolderKanban, Mail } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table'
import type { StatusVariant } from './table'

describe('Table', () => {
  describe('Rendering', () => {
    it('renders table', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      expect(container.querySelector('[data-slot="table"]')).toBeInTheDocument()
    })

    it('renders complete table structure', () => {
      render(
        <Table>
          <TableCaption>A list of users</TableCaption>
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
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell>1 user</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )

      expect(screen.getByText('A list of users')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('1 user')).toBeInTheDocument()
    })
  })

  describe('Table Structure', () => {
    it('renders table header', () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )

      expect(
        container.querySelector('[data-slot="table-header"]')
      ).toBeInTheDocument()
      expect(screen.getByText('Header')).toBeInTheDocument()
    })

    it('renders table body', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Body cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(
        container.querySelector('[data-slot="table-body"]')
      ).toBeInTheDocument()
      expect(screen.getByText('Body cell')).toBeInTheDocument()
    })

    it('renders table footer', () => {
      const { container } = render(
        <Table>
          <TableFooter>
            <TableRow>
              <TableCell>Footer cell</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )

      expect(
        container.querySelector('[data-slot="table-footer"]')
      ).toBeInTheDocument()
      expect(screen.getByText('Footer cell')).toBeInTheDocument()
    })

    it('renders table caption', () => {
      const { container } = render(
        <Table>
          <TableCaption>Table caption</TableCaption>
        </Table>
      )

      expect(
        container.querySelector('[data-slot="table-caption"]')
      ).toBeInTheDocument()
      expect(screen.getByText('Table caption')).toBeInTheDocument()
    })
  })

  describe('Table Rows and Cells', () => {
    it('renders multiple rows', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Row 1</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Row 2</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Row 3</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByText('Row 1')).toBeInTheDocument()
      expect(screen.getByText('Row 2')).toBeInTheDocument()
      expect(screen.getByText('Row 3')).toBeInTheDocument()
    })

    it('renders multiple cells per row', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell 1</TableCell>
              <TableCell>Cell 2</TableCell>
              <TableCell>Cell 3</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByText('Cell 1')).toBeInTheDocument()
      expect(screen.getByText('Cell 2')).toBeInTheDocument()
      expect(screen.getByText('Cell 3')).toBeInTheDocument()
    })

    it('renders table head cells', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header 1</TableHead>
              <TableHead>Header 2</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )

      expect(screen.getByText('Header 1')).toBeInTheDocument()
      expect(screen.getByText('Header 2')).toBeInTheDocument()
    })
  })

  describe('Table Data Types', () => {
    it('renders text content', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Text content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByText('Text content')).toBeInTheDocument()
    })

    it('renders numeric content', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>123</TableCell>
              <TableCell>45.67</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByText('123')).toBeInTheDocument()
      expect(screen.getByText('45.67')).toBeInTheDocument()
    })

    it('renders component content', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <button>Action</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('renders mixed content types', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Text</TableCell>
              <TableCell>123</TableCell>
              <TableCell>
                <span>Component</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByText('Text')).toBeInTheDocument()
      expect(screen.getByText('123')).toBeInTheDocument()
      expect(screen.getByText('Component')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has table role', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('has rowgroup role for header', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )

      expect(screen.getByRole('rowgroup')).toBeInTheDocument()
    })

    it('has row roles', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByRole('row')).toBeInTheDocument()
    })

    it('has cell roles', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByRole('cell')).toBeInTheDocument()
    })

    it('has columnheader roles for head cells', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )

      expect(screen.getByRole('columnheader')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className on table', () => {
      const { container } = render(
        <Table className="custom-table">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const table = container.querySelector('[data-slot="table"]')
      expect(table).toHaveClass('custom-table')
    })

    it('accepts custom className on header', () => {
      const { container } = render(
        <Table>
          <TableHeader className="custom-header">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )

      const header = container.querySelector('[data-slot="table-header"]')
      expect(header).toHaveClass('custom-header')
    })

    it('accepts custom className on body', () => {
      const { container } = render(
        <Table>
          <TableBody className="custom-body">
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const body = container.querySelector('[data-slot="table-body"]')
      expect(body).toHaveClass('custom-body')
    })

    it('accepts custom className on row', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow className="custom-row">
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const row = container.querySelector('[data-slot="table-row"]')
      expect(row).toHaveClass('custom-row')
    })

    it('accepts custom className on cell', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell">Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const cell = container.querySelector('[data-slot="table-cell"]')
      expect(cell).toHaveClass('custom-cell')
    })

    it('applies data attributes', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Selected row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      const row = container.querySelector('[data-slot="table-row"]')
      expect(row).toHaveAttribute('data-state', 'selected')
    })
  })

  describe('Use Cases', () => {
    it('renders user list table', () => {
      const users = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ]

      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('renders table with actions', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Item 1</TableCell>
              <TableCell>
                <button>Edit</button>
                <button>Delete</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })

    it('renders table with footer summary', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Product A</TableCell>
              <TableCell>$10</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Product B</TableCell>
              <TableCell>$20</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell>$30</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )

      expect(screen.getByText('Product A')).toBeInTheDocument()
      expect(screen.getByText('Product B')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('$30')).toBeInTheDocument()
    })

    it('renders empty table with message', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>No data available</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )

      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })
})

describe('Table.TitleCell', () => {
  it('renders text with font-medium', () => {
    render(<Table.TitleCell>Project Alpha</Table.TitleCell>)
    const span = screen.getByText('Project Alpha')
    expect(span).toBeInTheDocument()
    expect(span).toHaveClass('font-medium')
  })

  it('renders with an icon', () => {
    const { container } = render(
      <Table.TitleCell icon={FolderKanban}>Project Alpha</Table.TitleCell>
    )
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without icon when none provided', () => {
    const { container } = render(
      <Table.TitleCell>Project Alpha</Table.TitleCell>
    )
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <Table.TitleCell className="w-[200px]">Test</Table.TitleCell>
    )
    const wrapper = container.querySelector('[data-slot="table-title-cell"]')
    expect(wrapper).toHaveClass('w-[200px]')
  })

  it('has correct data-slot attribute', () => {
    const { container } = render(<Table.TitleCell>Test</Table.TitleCell>)
    expect(
      container.querySelector('[data-slot="table-title-cell"]')
    ).toBeInTheDocument()
  })
})

describe('Table.SecondaryCell', () => {
  it('renders text with muted foreground', () => {
    const { container } = render(
      <Table.SecondaryCell>user@example.com</Table.SecondaryCell>
    )
    const wrapper = container.querySelector(
      '[data-slot="table-secondary-cell"]'
    )
    expect(wrapper).toHaveClass('text-muted-foreground')
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('renders with an icon', () => {
    const { container } = render(
      <Table.SecondaryCell icon={Mail}>user@example.com</Table.SecondaryCell>
    )
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without icon when none provided', () => {
    const { container } = render(
      <Table.SecondaryCell>user@example.com</Table.SecondaryCell>
    )
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <Table.SecondaryCell className="w-[250px] truncate">
        Long text
      </Table.SecondaryCell>
    )
    const wrapper = container.querySelector(
      '[data-slot="table-secondary-cell"]'
    )
    expect(wrapper).toHaveClass('w-[250px]')
    expect(wrapper).toHaveClass('truncate')
  })

  it('has correct data-slot attribute', () => {
    const { container } = render(
      <Table.SecondaryCell>Test</Table.SecondaryCell>
    )
    expect(
      container.querySelector('[data-slot="table-secondary-cell"]')
    ).toBeInTheDocument()
  })
})

describe('Table.NumericCell', () => {
  it('renders with right-aligned monospace muted text', () => {
    const { container } = render(
      <Table.NumericCell>42.50h</Table.NumericCell>
    )
    const wrapper = container.querySelector(
      '[data-slot="table-numeric-cell"]'
    )
    expect(wrapper).toHaveClass('text-right')
    expect(wrapper).toHaveClass('font-mono')
    expect(wrapper).toHaveClass('text-muted-foreground')
    expect(screen.getByText('42.50h')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <Table.NumericCell className="w-[80px]">1:30</Table.NumericCell>
    )
    const wrapper = container.querySelector(
      '[data-slot="table-numeric-cell"]'
    )
    expect(wrapper).toHaveClass('w-[80px]')
  })

  it('has correct data-slot attribute', () => {
    const { container } = render(
      <Table.NumericCell>100</Table.NumericCell>
    )
    expect(
      container.querySelector('[data-slot="table-numeric-cell"]')
    ).toBeInTheDocument()
  })
})

describe('Table.EmailCell', () => {
  it('renders email text with muted foreground', () => {
    const { container } = render(
      <Table.EmailCell>alice@example.com</Table.EmailCell>
    )
    const wrapper = container.querySelector('[data-slot="table-email-cell"]')
    expect(wrapper).toHaveClass('text-muted-foreground')
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('renders with built-in Mail icon', () => {
    const { container } = render(
      <Table.EmailCell>alice@example.com</Table.EmailCell>
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies truncate on text span', () => {
    render(<Table.EmailCell>very-long-email@example.com</Table.EmailCell>)
    const span = screen.getByText('very-long-email@example.com')
    expect(span).toHaveClass('truncate')
  })

  it('applies custom className', () => {
    const { container } = render(
      <Table.EmailCell className="w-[200px]">test@test.com</Table.EmailCell>
    )
    const wrapper = container.querySelector('[data-slot="table-email-cell"]')
    expect(wrapper).toHaveClass('w-[200px]')
  })

  it('has correct data-slot attribute', () => {
    const { container } = render(
      <Table.EmailCell>test@test.com</Table.EmailCell>
    )
    expect(
      container.querySelector('[data-slot="table-email-cell"]')
    ).toBeInTheDocument()
  })
})

describe('Table.DateTimeCell', () => {
  it('renders with muted foreground and tabular-nums', () => {
    const { container } = render(
      <Table.DateTimeCell>2025-01-15</Table.DateTimeCell>
    )
    const wrapper = container.querySelector(
      '[data-slot="table-datetime-cell"]'
    )
    expect(wrapper).toHaveClass('text-muted-foreground')
    expect(wrapper).toHaveClass('tabular-nums')
    expect(screen.getByText('2025-01-15')).toBeInTheDocument()
  })

  it('renders formatted datetime strings', () => {
    render(
      <Table.DateTimeCell>Jan 15, 2025 14:30</Table.DateTimeCell>
    )
    expect(screen.getByText('Jan 15, 2025 14:30')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <Table.DateTimeCell className="w-[110px]">2025-01-15</Table.DateTimeCell>
    )
    const wrapper = container.querySelector(
      '[data-slot="table-datetime-cell"]'
    )
    expect(wrapper).toHaveClass('w-[110px]')
  })

  it('has correct data-slot attribute', () => {
    const { container } = render(
      <Table.DateTimeCell>2025-01-15</Table.DateTimeCell>
    )
    expect(
      container.querySelector('[data-slot="table-datetime-cell"]')
    ).toBeInTheDocument()
  })
})

describe('Table.StatusCell', () => {
  it('renders text content', () => {
    render(<Table.StatusCell variant="success">Active</Table.StatusCell>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('has base pill styles', () => {
    const { container } = render(
      <Table.StatusCell variant="success">Active</Table.StatusCell>
    )
    const el = container.querySelector('[data-slot="table-status-cell"]')
    expect(el).toHaveClass('inline-flex')
    expect(el).toHaveClass('rounded')
    expect(el).toHaveClass('border')
    expect(el).toHaveClass('px-2')
    expect(el).toHaveClass('font-medium')
  })

  const variantCases: Array<{
    variant: StatusVariant
    bgClass: string
    textClass: string
    borderClass: string
  }> = [
    { variant: 'success', bgClass: 'bg-success-dim', textClass: 'text-success', borderClass: 'border-success-border' },
    { variant: 'warning', bgClass: 'bg-warning-dim', textClass: 'text-warning', borderClass: 'border-warning-border' },
    { variant: 'destructive', bgClass: 'bg-destructive-dim', textClass: 'text-destructive', borderClass: 'border-destructive-border' },
    { variant: 'info', bgClass: 'bg-info-dim', textClass: 'text-info', borderClass: 'border-info-border' },
    { variant: 'muted', bgClass: 'bg-muted', textClass: 'text-muted-foreground', borderClass: 'border-border' },
  ]

  variantCases.forEach(({ variant, bgClass, textClass, borderClass }) => {
    it(`applies ${variant} variant classes`, () => {
      const { container } = render(
        <Table.StatusCell variant={variant}>Label</Table.StatusCell>
      )
      const el = container.querySelector('[data-slot="table-status-cell"]')
      expect(el).toHaveClass(bgClass)
      expect(el).toHaveClass(textClass)
      expect(el).toHaveClass(borderClass)
    })
  })

  it('applies custom className', () => {
    const { container } = render(
      <Table.StatusCell variant="success" className="uppercase">
        Active
      </Table.StatusCell>
    )
    const el = container.querySelector('[data-slot="table-status-cell"]')
    expect(el).toHaveClass('uppercase')
  })

  it('has correct data-slot attribute', () => {
    const { container } = render(
      <Table.StatusCell variant="muted">Draft</Table.StatusCell>
    )
    expect(
      container.querySelector('[data-slot="table-status-cell"]')
    ).toBeInTheDocument()
  })
})
