# Hooks

This directory contains custom React hooks for the application.

## Available Hooks

### `use-mobile.ts`

Detects mobile viewport:

```typescript
import { useIsMobile } from '@/hooks/use-mobile'

const isMobile = useIsMobile()
// true if viewport width < 768px
```

## Creating New Hooks

```typescript
// src/hooks/use-something.ts
import { useState, useEffect } from 'react'

export function useSomething(initialValue: string) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    // Side effect logic
  }, [value])

  return { value, setValue }
}
```

## Testing Hooks

Use `@testing-library/react`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useSomething } from './use-something'

describe('useSomething', () => {
  it('should update value', () => {
    const { result } = renderHook(() => useSomething('initial'))

    act(() => {
      result.current.setValue('updated')
    })

    expect(result.current.value).toBe('updated')
  })
})
```

### Testing Viewport-Dependent Hooks

```typescript
describe('useIsMobile', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
    })
  })

  it('should return true for mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      writable: true,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
```

See [docs/testing.md](/docs/testing.md) for comprehensive testing guide.
