'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createCompany, joinCompany } from '@/app/actions/company'
import { createClientSupabaseClient } from '@/lib/supabase-client'

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('')
  const [joinCompanyId, setJoinCompanyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setCheckingAuth(false)
      }
    })
  }, [router, supabase.auth])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('[Onboarding] Creating company for user:', user?.id);
      console.log('[Onboarding] Company name:', companyName);
      
      if (!user) {
        setError('You must be logged in to create a company')
        setLoading(false)
        return
      }

      const result = await createCompany(companyName, user.id)
      
      console.log('[Onboarding] Create company result:', result);

      if (!result.success) {
        setError(result.error || 'Failed to create company')
        setLoading(false)
        return
      }

      console.log('[Onboarding] Company created successfully, redirecting to:', `/dashboard/${result.data.id}`);
      router.push(`/dashboard/${result.data.id}`)
      router.refresh()
    } catch (error: any) {
      console.error('[Onboarding] Error creating company:', error);
      setError(error.message || 'An error occurred')
      setLoading(false)
    }
  }

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to join a company')
        setLoading(false)
        return
      }

      const result = await joinCompany(joinCompanyId, user.id)

      if (!result.success) {
        setError(result.error || 'Failed to join company')
        setLoading(false)
        return
      }

      router.push(`/dashboard/${joinCompanyId}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Get Started
          </CardTitle>
          <CardDescription>
            Create a new company or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Company</TabsTrigger>
              <TabsTrigger value="join">Join Company</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4">
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    type="text"
                    placeholder="My Company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used to identify your company
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-md text-sm bg-destructive/15 text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Company'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <form onSubmit={handleJoinCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-id">Company ID</Label>
                  <Input
                    id="company-id"
                    type="text"
                    placeholder="company-id"
                    value={joinCompanyId}
                    onChange={(e) => setJoinCompanyId(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the company ID provided by your administrator
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-md text-sm bg-destructive/15 text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Joining...' : 'Join Company'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
