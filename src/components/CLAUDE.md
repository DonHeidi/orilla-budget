# Components

This directory contains React components for the application.

## Structure

```
components/
├── ui/                  # Base UI components (shadcn/ui based)
│   ├── button.tsx
│   ├── input.tsx
│   ├── sheet.tsx
│   └── ...
├── data-table.tsx       # Reusable data table
├── theme-provider.tsx   # Theme context
└── ...
```

## UI Components

Base components in `ui/` are based on **shadcn/ui** with Radix UI primitives and Tailwind CSS styling.

### Using UI Components

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

<Button variant="outline" size="sm">Click me</Button>
<Input placeholder="Enter text" />
```

## CRUD UI Pattern

All entity management follows this consistent pattern:

### 1. List Page (`entity.tsx`)

```typescript
function EntityPage() {
  const { entities } = Route.useLoaderData()

  return (
    <div>
      <div className="flex justify-between">
        <h1>Entities</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Add Entity</Button>
          </SheetTrigger>
          <SheetContent>
            <AddEntityForm />
          </SheetContent>
        </Sheet>
      </div>

      <DataTable
        data={entities}
        columns={columns}
        onRowClick={(row) => navigate({ to: `/entities/${row.id}` })}
      />

      <Outlet /> {/* Renders detail sheet */}
    </div>
  )
}
```

### 2. Detail Page (`entity.$id.tsx`)

Opens as Sheet overlay with click-to-edit fields:

```typescript
function EntityDetail() {
  const { id } = Route.useParams()
  const entity = useLoaderData()
  const router = useRouter()

  return (
    <Sheet open onOpenChange={() => navigate({ to: '/entities' })}>
      <SheetContent>
        <ClickToEditField
          value={entity.name}
          onSave={async (value) => {
            await updateEntityFn({ data: { id, name: value } })
            router.invalidate()
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
```

## Click-to-Edit Implementation

```typescript
const [editingField, setEditingField] = useState<string | null>(null)
const [editedValues, setEditedValues] = useState<Partial<Entity>>({})

const handleFieldClick = (fieldName: string) => setEditingField(fieldName)

const handleFieldBlur = async () => {
  if (Object.keys(editedValues).length > 0) {
    await updateEntityFn({ data: editedValues })
    router.invalidate()
    setEditedValues({})
  }
  setEditingField(null)
}

// In JSX:
{editingField === 'name' ? (
  <Input
    autoFocus
    value={currentValues.name}
    onChange={(e) => setEditedValues({ ...editedValues, name: e.target.value })}
    onBlur={handleFieldBlur}
  />
) : (
  <p onClick={() => handleFieldClick('name')} className="cursor-pointer hover:bg-muted">
    {currentValues.name}
  </p>
)}
```

## Forms

Use TanStack Form with Zod validation:

```typescript
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'

const form = useForm({
  defaultValues: { name: '', email: '' },
  validatorAdapter: zodValidator(),
  onSubmit: async ({ value }) => {
    await createEntityFn({ data: value })
    router.invalidate()
  },
})
```

## Theme System

- Theme stored in cookies (`orilla-ui-theme`)
- Server-side detection in `__root.tsx`
- Supports `dark`, `light`, `system` modes

```typescript
import { useTheme } from '@/components/theme-provider'

const { theme, setTheme } = useTheme()
```

## Key Rules

- Use `router.invalidate()` after mutations
- Never use `window.location.reload()`
- Click-to-edit saves on blur
- Sheets used for both add and detail views
