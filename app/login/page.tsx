'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import Link from 'next/link'

function LoginForm() {
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
	const [currentUser, setCurrentUser] = useState<any>(null)
	const router = useRouter()
	const searchParams = useSearchParams()
	const supabase = createClientSupabaseClient()

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: searchParams.get('email') || '',
		},
	})

	useEffect(() => {
		// Check if user is already logged in
		supabase.auth.getUser().then(({ data: { user } }) => {
			setCurrentUser(user)
		})
	}, [supabase])

	const onSubmit = async (data: LoginFormData) => {
		setLoading(true)
		setMessage(null)

		try {
			// Sign in
			const { data: signInData, error } = await supabase.auth.signInWithPassword({
				email: data.email,
				password: data.password,
			})

			if (error) {
				// Provide more helpful error messages
				if (error.message.includes('Invalid login credentials')) {
					setMessage({
						type: 'error',
						text: 'Invalid email or password. Please check your credentials and try again.',
					})
				} else if (error.message.includes('Email not confirmed')) {
					setMessage({
						type: 'error',
						text: 'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
					})
				} else {
					setMessage({
						type: 'error',
						text: error.message || 'An error occurred',
					})
				}
				setLoading(false)
				return
			}

			// Ensure user is saved to the users table before proceeding
			const { ensureUserInDatabase } = await import('@/app/actions/users')
			await ensureUserInDatabase(signInData.user.id)

			// Check if user has companies
			const { data: memberships } = await supabase
				.from('companies_users')
				.select('company_id')
				.eq('user_id', signInData.user.id)
				.limit(1)

			// If no companies, redirect to onboarding
			// Otherwise, redirect to home (which will take them to their dashboard)
			if (!memberships || memberships.length === 0) {
				router.push('/onboarding')
			} else {
				router.push('/')
			}
			router.refresh()
		} catch (error: any) {
			setMessage({
				type: 'error',
				text: error.message || 'An error occurred',
			})
			setLoading(false)
		}
	}

	const handleMagicLink = async (email: string) => {
		if (!email) {
			setMessage({
				type: 'error',
				text: 'Please enter your email address',
			})
			return
		}

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

	// If user is already logged in, show message
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
							onClick={async () => {
								setLoading(true)
								await supabase.auth.signOut()
								setCurrentUser(null)
								router.refresh()
							}}
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
					<CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
					<CardDescription>
						Enter your email and password to login
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								{...register('email')}
								disabled={loading}
								className={errors.email ? 'border-destructive' : ''}
							/>
							{errors.email && (
								<p className="text-sm text-destructive">{errors.email.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								{...register('password')}
								disabled={loading}
								className={errors.password ? 'border-destructive' : ''}
							/>
							{errors.password && (
								<p className="text-sm text-destructive">{errors.password.message}</p>
							)}
						</div>

						{message && (
							<div
								className={`p-3 rounded-md text-sm ${message.type === 'error'
									? 'bg-destructive/15 text-destructive'
									: 'bg-green-500/15 text-green-600 dark:text-green-400'
									}`}
							>
								{message.text}
							</div>
						)}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Signing in...' : 'Sign in'}
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
						onClick={() => {
							const emailInput = document.getElementById('email') as HTMLInputElement
							handleMagicLink(emailInput?.value || '')
						}}
						disabled={loading}
					>
						Send magic link
					</Button>

					<div className="text-center text-sm">
						<span className="text-muted-foreground">Don't have an account? </span>
						<Link href="/signup" className="text-primary hover:underline">
							Sign up
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default function LoginPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="space-y-1">
						<CardTitle className="text-2xl font-bold">Loading...</CardTitle>
					</CardHeader>
				</Card>
			</div>
		}>
			<LoginForm />
		</Suspense>
	)
}
