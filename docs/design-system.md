# Design System Documentation

This document describes the design system implementation in the feature-theme-redesign branch.

## Overview

The design system uses an intentionally achromatic palette suitable for prototyping, with infrastructure ready for color theming. It emphasizes typography hierarchy and consistent component patterns.

## Typography

### Font Stack

| Purpose | Font | Weights | Usage |
|---------|------|---------|-------|
| Body | Space Grotesk | 300-700 | General text, labels, descriptions |
| Display | Anton | 400 | Titles, headers, section labels |
| Display SC | Anton SC | 400 | Small caps variant (available) |

### Typography Patterns

**Dialog/Page Titles:**
```tsx
<DialogTitle className="font-display text-lg tracking-wide">
```

**Section Headers:**
```tsx
<h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
```

**Form Labels:**
```tsx
<label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
```

**Body Text:**
```tsx
<p className="text-sm text-muted-foreground">
```

## Color System

### Implementation

Colors use the OKLCH color space for perceptual uniformity. The palette is achromatic by design for the prototype phase.

**Light Mode (`:root`):**
```css
--background: oklch(0.995 0.002 90);    /* Near-white, warm tint */
--foreground: oklch(0.13 0.01 260);     /* Near-black, cool tint */
--primary: oklch(0.18 0.01 260);        /* Dark primary */
--muted: oklch(0.96 0.003 90);          /* Subtle background */
--accent: oklch(0.96 0.003 90);         /* Interactive highlight */
--destructive: oklch(0.55 0.2 25);      /* Error/danger states */
```

**Dark Mode (`.dark`):**
```css
--background: oklch(0.12 0.01 260);
--foreground: oklch(0.985 0.002 90);
--primary: oklch(0.985 0.002 90);
--muted: oklch(0.2 0.01 260);
--accent: oklch(0.25 0.01 260);
```

### Semantic Tokens

| Token | Purpose |
|-------|---------|
| `bg-background` | Page/container backgrounds |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text, labels |
| `bg-muted` | Subtle backgrounds, icon containers |
| `bg-muted/30` | Dialog footers, subtle fills |
| `border-border/40` | Subtle dividers |
| `text-destructive` | Error messages |

### Adding Color Later

To introduce accent colors, increase the chroma (second OKLCH value) and set a hue:
```css
/* Example: Adding a teal accent */
--accent: oklch(0.65 0.15 195);

/* Example: Adding a warm amber */
--accent: oklch(0.75 0.12 85);
```

## Component Patterns

### Dialog Forms

All create/edit dialogs follow this structure:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add Item
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[500px] p-0">
    {/* Header */}
    <DialogHeader className="px-6 py-5 border-b border-border/40">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <DialogTitle className="font-display text-lg tracking-wide">
            Title
          </DialogTitle>
          <DialogDescription className="mt-1">
            Description text
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>

    {/* Form Content */}
    <form className="px-6 py-6 space-y-6">
      <div className="space-y-4">
        <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
          Section Header
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Field Label *
          </label>
          <Input placeholder="Placeholder text" className="h-10" />
        </div>
      </div>
    </form>

    {/* Footer */}
    <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
      <Button type="button" variant="outline" size="sm">
        Cancel
      </Button>
      <Button type="submit" size="sm">
        Create
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Form Field Errors

```tsx
{field.state.meta.errors && field.state.meta.errors.length > 0 && (
  <p className="text-sm text-destructive">
    {field.state.meta.errors
      .map((err) =>
        typeof err === 'string' ? err : err.message || JSON.stringify(err)
      )
      .join(', ')}
  </p>
)}
```

### Success States

For dialogs showing success (e.g., invitation codes):
```tsx
<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
  <h3 className="font-display text-base tracking-wide text-green-900 dark:text-green-100 mb-2">
    Success Title
  </h3>
  <p className="text-sm text-green-800 dark:text-green-200">
    Success message
  </p>
</div>
```

### Tab Navigation

```tsx
<div className="flex gap-2 mb-6 border-b">
  <Link
    to="/dashboard/section"
    className={`px-4 py-2 font-medium transition-colors ${
      isActive
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
    }`}
  >
    <Icon className="inline-block mr-2 h-4 w-4" />
    Tab Label ({count})
  </Link>
</div>
```

### Data Tables

Tables use the `DataTable` component with consistent patterns:
```tsx
<DataTable
  columns={columns}
  data={data}
  getRowId={(row) => row.id}
  onRowClick={(row) => {
    navigate({ to: '/dashboard/items/$id', params: { id: row.original.id } })
  }}
/>
```

## File Structure

```
src/
├── styles/
│   └── app.css              # Theme tokens, fonts, CSS variables
├── components/
│   ├── ui/
│   │   ├── button.tsx       # Button variants
│   │   ├── card.tsx         # Card components
│   │   ├── dialog.tsx       # Dialog primitives
│   │   ├── input.tsx        # Form inputs
│   │   └── ...
│   └── DataTable.tsx        # Table component
└── routes/
    └── dashboard/
        ├── projects.tsx     # Example: AddProjectDialog
        ├── users.tsx        # Example: AddUserDialog
        └── ...
```

## Design Decisions

### Why OKLCH?

OKLCH provides perceptually uniform color manipulation. When adjusting lightness or chroma, colors remain visually consistent. This makes theming predictable.

### Why Achromatic?

The prototype phase intentionally avoids color decisions to:
1. Focus on information hierarchy and layout
2. Ensure accessibility through contrast alone
3. Allow easy theming later without redesigning components

### Why Space Grotesk + Anton?

- **Space Grotesk**: Geometric sans with genuine personality - the distinctive G, quirky numerals, and retro-futuristic character set it apart from blander alternatives. Readable at all sizes while maintaining visual interest.
- **Anton**: Bold condensed display face that creates strong hierarchy, works well with `tracking-wide` treatment.

**Current limitation:** The typography has more personality than the surrounding design system currently supports. The achromatic palette and stock component styling don't yet match the energy of these font choices. When moving beyond prototype phase, the color palette, spacing, and component details should be elevated to complement the typography's character.

### Self-Hosted Fonts

Fonts are self-hosted for GDPR compliance (no Google Fonts API calls):
```css
@font-face {
  font-family: 'Space Grotesk';
  src: url('/fonts/SpaceGrotesk-Variable.woff2') format('woff2');
}
```

## Future Considerations

1. **Accent Color**: When ready, add a signature accent by increasing OKLCH chroma
2. **Motion**: Consider staggered list animations and dialog entry effects
3. **Component Variants**: Expand button/card variants for different contexts
4. **Dark Mode Polish**: Fine-tune contrast ratios for dark mode
