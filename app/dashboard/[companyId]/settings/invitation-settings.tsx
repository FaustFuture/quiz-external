"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generateInvitationToken } from "@/app/actions/company"
import { toast } from "sonner"

interface InvitationSettingsProps {
	companyId: string
	companyName: string
	initialInvitationLink: string | null
}

export default function InvitationSettings({
	companyId,
	companyName,
	initialInvitationLink
}: InvitationSettingsProps) {
	const [invitationLink, setInvitationLink] = useState<string | null>(initialInvitationLink)
	const [copied, setCopied] = useState(false)
	const [loading, setLoading] = useState(false)

	const loadInvitationLink = async () => {
		setLoading(true)
		try {
			const result = await generateInvitationToken(companyId)
			if (result.success && result.token) {
				const link = `${window.location.origin}/invite/${result.token}`
				setInvitationLink(link)
			} else {
				toast.error(result.error || "Failed to load invitation link")
			}
		} catch (error) {
			console.error("Error loading invitation link:", error)
			toast.error("Failed to load invitation link")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (!invitationLink) {
			loadInvitationLink()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [companyId])

	const copyToClipboard = async () => {
		if (!invitationLink) return

		try {
			await navigator.clipboard.writeText(invitationLink)
			setCopied(true)
			toast.success("Invitation link copied to clipboard")
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.error("Failed to copy:", error)
			toast.error("Failed to copy link")
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Link2 className="h-5 w-5" />
					<CardTitle>Invitation Link</CardTitle>
				</div>
				<CardDescription>
					Share this link to invite users to {companyName}. Users will be automatically signed up and joined to your company - no email or password required!
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{loading ? (
					<div className="text-sm text-muted-foreground">Loading invitation link...</div>
				) : invitationLink ? (
					<>
						<div className="flex items-center gap-2 p-4 rounded-lg bg-muted border">
							<code className="flex-1 text-sm break-all">{invitationLink}</code>
							<Button
								variant="outline"
								size="icon"
								onClick={copyToClipboard}
								className="shrink-0"
							>
								{copied ? (
									<Check className="h-4 w-4 text-green-600" />
								) : (
									<Copy className="h-4 w-4" />
								)}
							</Button>
						</div>
						<Button onClick={copyToClipboard} className="w-full">
							{copied ? (
								<>
									<Check className="mr-2 h-4 w-4" />
									Copied!
								</>
							) : (
								<>
									<Copy className="mr-2 h-4 w-4" />
									Copy Invitation Link
								</>
							)}
						</Button>
						<div className="text-xs text-muted-foreground space-y-1">
							<p>• This link never expires</p>
							<p>• Anyone with the link can join your company</p>
							<p>• Users are automatically signed up with anonymous accounts</p>
							<p>• Users can add their email and name later in profile settings</p>
						</div>
					</>
				) : (
					<div className="text-sm text-destructive">Failed to load invitation link</div>
				)}
			</CardContent>
		</Card>
	)
}

