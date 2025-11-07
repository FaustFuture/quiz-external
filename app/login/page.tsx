'use client'

import { useState, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        setMessage({
          type: 'success',
          text: 'Account created! Check your email to confirm your account, then you can set up your company.',
        })
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Check if user has companies
        const { data: memberships } = await supabase
          .from('companies_users')
          .select('company_id')
          .eq('user_id', data.user.id)
          .limit(1)

        // If no companies, redirect to onboarding
        // Otherwise, redirect to home (which will take them to their dashboard)
        if (!memberships || memberships.length === 0) {
          router.push('/onboarding')
        } else {
          router.push('/')
        }
        router.refresh()
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Check your email for the magic link!',
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setCurrentUser(null)
      setMessage({
        type: 'success',
        text: 'Successfully logged out!',
      })
      router.refresh()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  // If user is logged in, show logout option
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Already Logged In</CardTitle>
            <CardDescription>
              You're currently logged in as {currentUser.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === 'error'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-green-500/15 text-green-600 dark:text-green-400'
                }`}
              >
                {message.text}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
              disabled={loading}
            >
              Go to Home
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? 'Logging out...' : 'Log out'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Enter your email to create your account'
              : 'Enter your email and password to login'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === 'error'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-green-500/15 text-green-600 dark:text-green-400'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleMagicLink}
            disabled={loading || !email}
          >
            Send magic link
          </Button>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage(null)
              }}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
