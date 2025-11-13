"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { generateInvitationToken } from "@/app/actions/company"
import { toast } from "sonner"

interface InvitationLinkButtonProps {
	companyId: string
}

export function InvitationLinkButton({ companyId }: InvitationLinkButtonProps) {
	const [invitationLink, setInvitationLink] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadInvitationLink()
	}, [companyId])

	const loadInvitationLink = async () => {
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
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" disabled={loading}>
					<Link2 className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel>Invitation Link</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{loading ? (
					<div className="p-2 text-sm text-muted-foreground">Loading...</div>
				) : invitationLink ? (
					<>
						<div className="p-2">
							<p className="text-xs text-muted-foreground mb-2">
								Share this link to invite users to your company. No email or password required!
							</p>
							<div className="flex items-center gap-2 p-2 rounded-md bg-muted border">
								<code className="flex-1 text-xs break-all">{invitationLink}</code>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0"
									onClick={copyToClipboard}
								>
									{copied ? (
										<Check className="h-4 w-4 text-green-600" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
						<DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
							<Copy className="mr-2 h-4 w-4" />
							Copy Link
						</DropdownMenuItem>
					</>
				) : (
					<div className="p-2 text-sm text-muted-foreground">Failed to load invitation link</div>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

