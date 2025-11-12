import type { ReactElement } from 'react'
import type { RenderOptions } from '@testing-library/react'
import { render as rtlRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/theme-provider'

/**
 * Custom render function that wraps components with common providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider defaultTheme="light" storageKey="orilla-ui-theme">
      {children}
    </ThemeProvider>
  )

  const rendered = rtlRender(ui, { wrapper: Wrapper, ...options })

  return {
    user: userEvent.setup(),
    ...rendered,
  }
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { userEvent }

// Override render with our custom render
export { customRender as render }
