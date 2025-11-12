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
import { signupSchema, type SignupFormData } from '@/lib/validations/auth'
import Link from 'next/link'

function SignupForm() {
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
		setError,
	} = useForm<SignupFormData>({
		resolver: zodResolver(signupSchema),
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

	const onSubmit = async (data: SignupFormData) => {
		setLoading(true)
		setMessage(null)

		try {
			// Check if email already exists before attempting signup
			const { checkEmailExists } = await import('@/app/actions/users')
			const emailCheck = await checkEmailExists(data.email)

			if (emailCheck.success && emailCheck.exists) {
				setError('email', {
					type: 'manual',
					message: 'This email address is already registered. Please sign in instead.',
				})
				setLoading(false)
				return
			}

			// Sign up
			const { data: signupData, error } = await supabase.auth.signUp({
				email: data.email,
				password: data.password,
				options: {
					emailRedirectTo: `${window.location.origin}/auth/callback`,
				},
			})

			if (error) {
				// Handle specific error cases
				if (
					error.message.includes('already registered') ||
					error.message.includes('already exists') ||
					error.message.includes('User already registered') ||
					error.message.includes('email address is already')
				) {
					setError('email', {
						type: 'manual',
						message: 'This email address is already registered. Please sign in instead.',
					})
					setLoading(false)
					return
				}
				setMessage({
					type: 'error',
					text: error.message || 'An error occurred during signup',
				})
				setLoading(false)
				return
			}

			// If user was created (even if not confirmed), save to database
			if (signupData?.user) {
				try {
					const { ensureUserInDatabase } = await import('@/app/actions/users')
					await ensureUserInDatabase(signupData.user.id)
				} catch (err) {
					// Non-critical error, continue with signup flow
					console.warn('Failed to save user to database during signup:', err)
				}
			}

			// Success - show message and redirect after 2 seconds
			setMessage({
				type: 'success',
				text: 'Account created! Redirecting to login...',
			})

			// Wait 2 seconds, then redirect to login with email pre-filled
			setTimeout(() => {
				router.push(`/login?email=${encodeURIComponent(data.email)}`)
			}, 2000)
		} catch (error: any) {
			setMessage({
				type: 'error',
				text: error.message || 'An error occurred',
			})
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
						>
							Go to Home
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={async () => {
								await supabase.auth.signOut()
								router.refresh()
							}}
						>
							Log out
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
					<CardTitle className="text-2xl font-bold">Create an account</CardTitle>
					<CardDescription>
						Enter your information to create your account
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
							<p className="text-xs text-muted-foreground">
								Must be at least 6 characters with uppercase, lowercase, and a number
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								{...register('confirmPassword')}
								disabled={loading}
								className={errors.confirmPassword ? 'border-destructive' : ''}
							/>
							{errors.confirmPassword && (
								<p className="text-sm text-destructive">
									{errors.confirmPassword.message}
								</p>
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
							{loading ? 'Creating account...' : 'Sign up'}
						</Button>
					</form>

					<div className="text-center text-sm">
						<span className="text-muted-foreground">Already have an account? </span>
						<Link href="/login" className="text-primary hover:underline">
							Sign in
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default function SignupPage() {
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
			<SignupForm />
		</Suspense>
	)
}
