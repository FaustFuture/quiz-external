import { requireAuth } from "@/lib/supabase-server"
import { getCompany, generateInvitationToken } from "@/app/actions/company"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import InvitationSettings from "./invitation-settings"
import { ProfileSettings } from "@/components/profile-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SettingsPageProps {
	params: Promise<{ companyId: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
	const { companyId } = await params
	const user = await requireAuth()

	// Check if user is admin
	const { data: membership } = await supabaseAdmin
		.from('companies_users')
		.select('role')
		.eq('company_id', companyId)
		.eq('user_id', user.id)
		.single()

	if (!membership || membership.role !== 'admin') {
		redirect(`/dashboard/${companyId}`)
	}

	// Get company data
	const company = await getCompany(companyId)
	if (!company) {
		redirect('/')
	}

	// Get invitation token
	const tokenResult = await generateInvitationToken(companyId)
	const invitationLink = tokenResult.success && tokenResult.token
		? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${tokenResult.token}`
		: null

	// Get fresh user data for profile settings
	const supabase = await createServerSupabaseClient()
	const { data: { user: freshUser } } = await supabase.auth.getUser()

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto p-8 max-w-4xl">
				<div className="space-y-6">
					<div>
						<Link href={`/dashboard/${companyId}`}>
							<Button variant="ghost" className="mb-4 gap-2 text-muted-foreground hover:text-foreground hover:bg-accent">
								<ArrowLeft className="h-4 w-4" />
								Back to Dashboard
							</Button>
						</Link>
						<h1 className="text-3xl font-bold">Settings</h1>
						<p className="text-muted-foreground mt-2">
							Manage your profile and company settings
						</p>
					</div>

					<Tabs defaultValue="profile" className="w-full">
						<TabsList>
							<TabsTrigger value="profile">Profile</TabsTrigger>
							<TabsTrigger value="company">Company</TabsTrigger>
						</TabsList>

						<TabsContent value="profile" className="space-y-6">
							{freshUser && <ProfileSettings user={freshUser} />}
						</TabsContent>

						<TabsContent value="company" className="space-y-6">
							<div className="rounded-lg border bg-card p-6">
								<h2 className="text-xl font-semibold mb-4">Company Information</h2>
								<div className="space-y-2">
									<div>
										<label className="text-sm font-medium text-muted-foreground">Company Name</label>
										<p className="text-lg">{company.name}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">Company ID</label>
										<p className="text-lg font-mono text-sm">{company.id}</p>
									</div>
								</div>
							</div>

							<InvitationSettings
								companyId={companyId}
								companyName={company.name}
								initialInvitationLink={invitationLink}
							/>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	)
}

