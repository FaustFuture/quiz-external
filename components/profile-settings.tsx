"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import {
	updateUserProfile,
	upgradeAnonymousAccount,
	updateUserPassword,
	setPasswordForUpgradedAccount
} from "@/app/actions/users"
import {
	profileUpdateSchema,
	anonymousUpgradeSchema,
	type ProfileUpdateFormData,
	type AnonymousUpgradeFormData
} from "@/lib/validations/auth"
import { toast } from "sonner"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface ProfileSettingsProps {
	user: SupabaseUser
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
	const supabase = createClientSupabaseClient()

	const isAnonymous = user.is_anonymous || !user.email
	const emailConfirmed = !!user.email_confirmed_at
	const hasPassword = !isAnonymous && emailConfirmed

	// Use different schemas based on account type
	const schema = isAnonymous ? anonymousUpgradeSchema : profileUpdateSchema
	const defaultValues = {
		email: user.email || "",
		firstName: user.user_metadata?.first_name || "",
		lastName: user.user_metadata?.last_name || "",
		password: "",
		confirmPassword: "",
	}

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		reset,
	} = useForm<ProfileUpdateFormData | AnonymousUpgradeFormData>({
		resolver: zodResolver(schema),
		defaultValues,
	})

	// Update form when user changes
	useEffect(() => {
		reset(defaultValues)
	}, [user.id, user.email, user.user_metadata])

	const onSubmit = async (data: ProfileUpdateFormData | AnonymousUpgradeFormData) => {
		setLoading(true)
		setMessage(null)

		try {
			if (isAnonymous) {
				// Anonymous user upgrading account
				const upgradeData = data as AnonymousUpgradeFormData
				const result = await upgradeAnonymousAccount(
					upgradeData.email,
					upgradeData.password,
					upgradeData.firstName,
					upgradeData.lastName
				)

				if (!result.success) {
					setMessage({ type: 'error', text: result.error || "Failed to upgrade account" })
					setLoading(false)
					return
				}

				if (result.requiresEmailConfirmation) {
					setMessage({
						type: 'success',
						text: 'Email confirmation sent! Please check your email and confirm your address, then return here to set your password.'
					})
					toast.success("Email confirmation sent! Check your inbox.")
					// Refresh user data
					await supabase.auth.refreshSession()
				}
			} else {
				// Regular user updating profile
				const profileData = data as ProfileUpdateFormData
				const result = await updateUserProfile(
					profileData.email,
					profileData.firstName,
					profileData.lastName
				)

				if (!result.success) {
					if (result.error?.includes("already registered")) {
						setError('email', { type: 'manual', message: result.error })
					} else {
						setMessage({ type: 'error', text: result.error || "Failed to update profile" })
					}
					setLoading(false)
					return
				}

				if (result.requiresEmailConfirmation) {
					setMessage({
						type: 'success',
						text: 'Email confirmation sent! Please check your email to confirm your new address.'
					})
					toast.success("Email confirmation sent! Check your inbox.")
				} else {
					setMessage({ type: 'success', text: 'Profile updated successfully!' })
					toast.success("Profile updated successfully!")
				}

				// Update password if provided
				if (profileData.password && profileData.password.length > 0) {
					const passwordResult = await updateUserPassword(profileData.password)
					if (!passwordResult.success) {
						toast.error(passwordResult.error || "Failed to update password")
					} else {
						toast.success("Password updated successfully!")
					}
				}

				// Refresh user data
				await supabase.auth.refreshSession()
			}
		} catch (error: any) {
			console.error("Error updating profile:", error)
			setMessage({ type: 'error', text: error.message || "An error occurred" })
			toast.error("An error occurred. Please try again.")
		} finally {
			setLoading(false)
		}
	}

	// Check if user needs to set password after email confirmation
	// User has confirmed email but no password set (upgraded anonymous account)
	const needsPasswordSetup = emailConfirmed && !user.is_anonymous && !user.app_metadata?.provider && user.email

	const handleSetPassword = async (password: string, confirmPassword: string) => {
		if (password !== confirmPassword) {
			toast.error("Passwords don't match")
			return
		}

		setLoading(true)
		try {
			const result = await setPasswordForUpgradedAccount(password)
			if (result.success) {
				toast.success("Password set successfully! Your account is now fully upgraded.")
				await supabase.auth.refreshSession()
				setMessage({
					type: 'success',
					text: 'Account upgraded successfully! You can now log in with your email and password.'
				})
			} else {
				toast.error(result.error || "Failed to set password")
			}
		} catch (error: any) {
			toast.error("An error occurred. Please try again.")
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="space-y-6">
			{isAnonymous && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Anonymous Account</AlertTitle>
					<AlertDescription>
						Upgrade your account by adding an email and password to keep access across devices.
						If you sign out without upgrading, you'll lose access to this account.
					</AlertDescription>
				</Alert>
			)}

			{needsPasswordSetup && (
				<Alert>
					<CheckCircle2 className="h-4 w-4" />
					<AlertTitle>Email Confirmed!</AlertTitle>
					<AlertDescription>
						Your email has been confirmed. Please set a password to complete your account upgrade.
					</AlertDescription>
				</Alert>
			)}

			{message && (
				<Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
					{message.type === 'error' ? (
						<AlertCircle className="h-4 w-4" />
					) : (
						<CheckCircle2 className="h-4 w-4" />
					)}
					<AlertDescription>{message.text}</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Profile Information</CardTitle>
					<CardDescription>
						{isAnonymous
							? "Add your email and password to upgrade your account"
							: "Update your profile information"
						}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email {isAnonymous && <span className="text-destructive">*</span>}</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								{...register('email')}
								disabled={loading || (emailConfirmed && !isAnonymous)}
								className={errors.email ? 'border-destructive' : ''}
							/>
							{errors.email && (
								<p className="text-sm text-destructive">{errors.email.message}</p>
							)}
							{emailConfirmed && !isAnonymous && (
								<p className="text-xs text-muted-foreground">
									Email confirmed. To change it, contact support.
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input
									id="firstName"
									type="text"
									placeholder="John"
									{...register('firstName')}
									disabled={loading}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="lastName">Last Name</Label>
								<Input
									id="lastName"
									type="text"
									placeholder="Doe"
									{...register('lastName')}
									disabled={loading}
								/>
							</div>
						</div>

						{!needsPasswordSetup && (
							<>
								<div className="space-y-2">
									<Label htmlFor="password">
										Password {isAnonymous && <span className="text-destructive">*</span>}
										{!isAnonymous && <span className="text-muted-foreground">(optional)</span>}
									</Label>
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
									{!isAnonymous && (
										<p className="text-xs text-muted-foreground">
											Leave blank to keep your current password
										</p>
									)}
									{isAnonymous && (
										<p className="text-xs text-muted-foreground">
											Must be at least 6 characters with uppercase, lowercase, and a number
										</p>
									)}
								</div>

								{isAnonymous && (
									<div className="space-y-2">
										<Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
										<Input
											id="confirmPassword"
											type="password"
											placeholder="••••••••"
											{...register('confirmPassword')}
											disabled={loading}
											className={errors.confirmPassword ? 'border-destructive' : ''}
										/>
										{errors.confirmPassword && (
											<p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
										)}
									</div>
								)}

								{!isAnonymous && (
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
											<p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
										)}
									</div>
								)}
							</>
						)}

						{needsPasswordSetup && (
							<div className="space-y-4 p-4 rounded-lg bg-muted">
								<h3 className="font-semibold">Set Password</h3>
								<div className="space-y-2">
									<Label htmlFor="setupPassword">Password <span className="text-destructive">*</span></Label>
									<Input
										id="setupPassword"
										type="password"
										placeholder="••••••••"
										disabled={loading}
									/>
									<p className="text-xs text-muted-foreground">
										Must be at least 6 characters with uppercase, lowercase, and a number
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor="setupConfirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
									<Input
										id="setupConfirmPassword"
										type="password"
										placeholder="••••••••"
										disabled={loading}
									/>
								</div>
								<Button
									type="button"
									onClick={() => {
										const passwordInput = document.getElementById('setupPassword') as HTMLInputElement
										const confirmInput = document.getElementById('setupConfirmPassword') as HTMLInputElement
										if (passwordInput && confirmInput) {
											handleSetPassword(passwordInput.value, confirmInput.value)
										}
									}}
									disabled={loading}
								>
									{loading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Setting Password...
										</>
									) : (
										"Set Password"
									)}
								</Button>
							</div>
						)}

						<Button type="submit" className="w-full" disabled={loading || needsPasswordSetup}>
							{loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{isAnonymous ? "Upgrading Account..." : "Updating Profile..."}
								</>
							) : (
								isAnonymous ? "Upgrade Account" : "Update Profile"
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

