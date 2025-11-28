/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import appCss from '@/styles/app.css?url'
import { ThemeProvider } from '@/components/theme-provider'

const getThemeFromCookieFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return getCookie('orilla-ui-theme') || 'system'
  }
)

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
        title: 'Orilla Budget',
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
      <ThemeProvider
        defaultTheme={theme as 'dark' | 'light' | 'system'}
        storageKey="orilla-ui-theme"
      >
        <Outlet />
      </ThemeProvider>
    </RootDocument>
  )
}

function RootDocument({
  children,
  theme,
}: ReadOnly<{ children: ReactNode; theme: string }>) {
  return (
    <html data-theme={theme}>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = '${theme}';
                const resolvedTheme = theme === 'system'
                  ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                  : theme;
                document.documentElement.classList.add(resolvedTheme);
              })();
            `,
          }}
        />
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
