import { requireAuth } from "@/lib/supabase-server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ProfileSettings } from "@/components/profile-settings"
import { getUserCompanies } from "@/app/actions/company"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage() {
	const user = await requireAuth()
	const supabase = await createServerSupabaseClient()

	// Get fresh user data with all metadata
	const { data: { user: freshUser } } = await supabase.auth.getUser()

	if (!freshUser) {
		redirect("/login")
	}

	// Get user's companies to determine where to go back
	const companies = await getUserCompanies(user.id)
	const firstCompanyId = companies.length > 0 ? companies[0].id : null
	const backUrl = firstCompanyId ? `/dashboard/${firstCompanyId}` : "/"

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto p-8 max-w-4xl">
				<div className="space-y-6">
					<div>
						<Link href={backUrl}>
							<Button variant="ghost" className="mb-4 gap-2 text-muted-foreground hover:text-foreground hover:bg-accent">
								<ArrowLeft className="h-4 w-4" />
								Back to Dashboard
							</Button>
						</Link>
						<h1 className="text-3xl font-bold">Settings</h1>
						<p className="text-muted-foreground mt-2">
							Manage your account settings and profile information
						</p>
					</div>

					<ProfileSettings user={freshUser} />
				</div>
			</div>
		</div>
	)
}

