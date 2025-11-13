import { redirect } from "next/navigation"
import { getCompanyByInvitationToken, joinCompanyViaInvitation } from "@/app/actions/company"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import InviteClient from "./invite-client"

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface InvitePageProps {
	params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
	const { token } = await params

	// Validate token and get company
	const companyResult = await getCompanyByInvitationToken(token)
	if (!companyResult.success || !companyResult.company) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
				<div className="w-full max-w-md rounded-lg bg-card p-8 border shadow-lg text-center">
					<h1 className="text-2xl font-bold mb-4 text-destructive">Invalid Invitation Link</h1>
					<p className="text-muted-foreground">
						{companyResult.error || "This invitation link is invalid or has expired."}
					</p>
				</div>
			</div>
		)
	}

	const company = companyResult.company

	// Check if user is already authenticated
	const supabase = await createServerSupabaseClient()
	const { data: { user } } = await supabase.auth.getUser()

	if (user) {
		// User is authenticated, join them to the company
		const joinResult = await joinCompanyViaInvitation(token, user.id)
		if (joinResult.success) {
			redirect(`/dashboard/${company.id}`)
		} else {
			return (
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
					<div className="w-full max-w-md rounded-lg bg-card p-8 border shadow-lg text-center">
						<h1 className="text-2xl font-bold mb-4 text-destructive">Error</h1>
						<p className="text-muted-foreground">
							{joinResult.error || "Failed to join company. Please try again."}
						</p>
					</div>
				</div>
			)
		}
	}

	// User is not authenticated, show client component to handle anonymous signup
	return <InviteClient token={token} companyName={company.name} />
}

