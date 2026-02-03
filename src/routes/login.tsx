import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        const { data, error: signInError } = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        })

        if (signInError) {
          setError(signInError.message || 'Invalid email or password')
          return
        }

        if (data) {
          // Better Auth handles cookie setting automatically via tanstackStartCookies plugin
          router.navigate({ to: '/dashboard' })
        }
      } catch (err) {
        console.error('Login error:', err)
        setError('An unexpected error occurred')
      }
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LogIn className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl tracking-wide">Sign in</CardTitle>
              <CardDescription className="mt-1">
                Enter your credentials to access your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-5"
          >
            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <label
                    htmlFor={field.name}
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <Input
                    id={field.name}
                    type="email"
                    placeholder="you@example.com"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <label
                    htmlFor={field.name}
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <Input
                    id={field.name}
                    type="password"
                    placeholder="Enter your password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete="current-password"
                    className="h-11"
                  />
                </div>
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => [state.isSubmitting]}
            >
              {([isSubmitting]) => (
                <Button type="submit" className="w-full h-11 font-medium" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
