"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { joinCompanyViaInvitation } from "@/app/actions/company"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface InviteClientProps {
	token: string
	companyName: string
}

export default function InviteClient({ token, companyName }: InviteClientProps) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()
	const supabase = createClientSupabaseClient()

	const handleJoin = async () => {
		setLoading(true)
		setError(null)

		try {
			// Check if user is already authenticated
			const { data: { user } } = await supabase.auth.getUser()

			let userId: string

			if (!user) {
				// Create anonymous account
				const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

				if (authError || !authData.user) {
					throw new Error(authError?.message || "Failed to create account")
				}

				userId = authData.user.id

				// Ensure user is saved to database
				try {
					const { ensureUserInDatabase } = await import("@/app/actions/users")
					await ensureUserInDatabase(userId)
				} catch (err) {
					console.warn("Failed to save user to database:", err)
					// Non-critical, continue
				}
			} else {
				userId = user.id
			}

			// Join company via invitation
			const joinResult = await joinCompanyViaInvitation(token, userId)

			if (!joinResult.success) {
				throw new Error(joinResult.error || "Failed to join company")
			}

			// Redirect to dashboard
			router.push(`/dashboard/${joinResult.company?.id}`)
			router.refresh()
		} catch (err: any) {
			console.error("Error joining company:", err)
			setError(err.message || "An error occurred. Please try again.")
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1 text-center">
					<CardTitle className="text-2xl font-bold">Join {companyName}</CardTitle>
					<CardDescription>
						Click the button below to automatically join this company. No email or password required!
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && (
						<div className="p-3 rounded-md text-sm bg-destructive/15 text-destructive">
							{error}
						</div>
					)}

					<Button
						onClick={handleJoin}
						className="w-full"
						disabled={loading}
						size="lg"
					>
						{loading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Joining...
							</>
						) : (
							"Join Company"
						)}
					</Button>

					<p className="text-xs text-center text-muted-foreground">
						You'll be automatically signed up and logged in. You can add your email and name later in your profile settings.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}

