# UI Components

Base components based on **shadcn/ui** with Radix UI primitives and Tailwind CSS.

## Table — Compound Cell Components

`table.tsx` exports both structural table elements (`Table`, `TableHeader`, `TableRow`, etc.) and **cell content components** attached directly as properties on the `Table` function (e.g. `Table.TitleCell = TitleCell`). These cell components standardise how data is displayed inside `<TableCell>` across the app.

### Pattern

```tsx
import { Table } from '@/components/ui/table'

// Use inside column `cell` renderers:
cell: ({ getValue }) => (
  <Table.TitleCell icon={FolderKanban}>{getValue() as string}</Table.TitleCell>
)
```

This works because JS functions are objects — properties can be assigned directly. `Table` works as both a `<table>` element and a namespace for cell components.

### Available Cell Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `Table.TitleCell` | Primary name/title — bold text, optional icon | `children`, `icon?: LucideIcon`, `className?` |
| `Table.SecondaryCell` | Supporting info — muted text, optional icon | `children`, `icon?: LucideIcon`, `className?` |
| `Table.NumericCell` | Numbers — right-aligned, monospace, muted | `children`, `className?` |
| `Table.EmailCell` | Email addresses — built-in Mail icon, truncates | `children`, `className?` |
| `Table.DateTimeCell` | Dates/times — muted, `tabular-nums` for alignment | `children`, `className?` |
| `Table.StatusCell` | Status pill — Indigo Ink color tokens | `children`, `variant`, `className?` |

### StatusCell Variants

Uses semantic color tokens from the Indigo Ink design system (`app.css`):

| Variant | Use case | Colors |
|---------|----------|--------|
| `success` | Approved, active, has account | `bg-success-dim text-success border-success-border` |
| `warning` | At risk, review needed | `bg-warning-dim text-warning border-warning-border` |
| `destructive` | Rejected, over budget | `bg-destructive-dim text-destructive border-destructive-border` |
| `info` | Submitted, budget category | `bg-info-dim text-info border-info-border` |
| `muted` | Draft, inactive, default | `bg-muted text-muted-foreground border-border` |

```tsx
import type { StatusVariant } from '@/components/ui/table'

<Table.StatusCell variant="success">Approved</Table.StatusCell>
<Table.StatusCell variant="destructive">Rejected</Table.StatusCell>
```

### When to Use vs. Not Use

**Use cell components** for read-only display cells where the pattern matches (title, email, date, status pill, numeric value).

**Don't use** for:
- Editable cells (double-click-to-edit uses inline `<Input>`)
- Cells with links (`<Link>` inside the cell)
- Cells with complex conditional rendering or multiple interactive elements
- Status badges outside tables (use `<Badge>` or `EntryStatusBadge` instead)

### Adding New Cell Components

1. Define the function in `table.tsx` with a `data-slot` attribute
2. Assign it to `Table`: `Table.MyCell = MyCell`
3. Add tests in `table.test.tsx`
4. Export any new types (like `StatusVariant`)
