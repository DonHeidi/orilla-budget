/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import appCss from '@/styles/app.css?url'
import { ThemeProvider } from '@/components/theme-provider'

const getThemeFromCookieFn = createServerFn({ method: 'GET' }).handler(async (ctx) => {
  const cookieHeader = ctx.request.headers.get('cookie') || ''
  const cookies = cookieHeader.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=')
    if (key && value) acc[key] = value
    return acc
  }, {} as Record<string, string>)
  return cookies['orilla-ui-theme'] || 'system'
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
	content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Orilla Budget'
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  loader: async () => {
    const theme = await getThemeFromCookieFn()
    return { theme }
  },
  component: RootComponent,
})

function RootComponent() {
  const { theme } = Route.useLoaderData()

  return (
    <RootDocument theme={theme}>
      <ThemeProvider defaultTheme={theme as 'dark' | 'light' | 'system'} storageKey="orilla-ui-theme">
        <Outlet />
      </ThemeProvider>
    </RootDocument>
    )
}

function RootDocument({ children, theme }: ReadOnly<{ children: ReactNode; theme: string }>) {
  // If theme is 'system', we need to add the appropriate class based on prefers-color-scheme
  // But we can't check that on the server, so we'll use a data attribute and handle it with CSS
  const themeClass = theme === 'system' ? 'system' : theme

  return (
    <html className={themeClass} data-theme={theme}>
      <head>
        <HeadContent />
      </head>
      <body
        data-gramm="false"
        data-lt-active="false"
        data-new-gr-c-s-check-loaded=""
        data-gr-ext-installed=""
      >
        {children}
	<Scripts />
      </body>
    </html>
  )
}
