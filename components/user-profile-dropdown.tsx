"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, User, Settings, AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function UserProfileDropdown() {
	const [user, setUser] = useState<SupabaseUser | null>(null)
	const [loading, setLoading] = useState(true)
	const [showLogoutWarning, setShowLogoutWarning] = useState(false)
	const router = useRouter()

	useEffect(() => {
		const supabase = createClientSupabaseClient()

		// Get initial user
		supabase.auth.getUser().then(({ data: { user } }) => {
			setUser(user)
			setLoading(false)
		})

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null)
		})

		return () => subscription.unsubscribe()
	}, [])

	const handleLogout = async () => {
		// Check if account is upgraded
		// Key indicator: if email is confirmed, user can log back in
		// Note: is_anonymous flag might still be true even after upgrade, so we check email_confirmed_at
		const emailConfirmed = !!user?.email_confirmed_at
		const hasEmail = !!user?.email

		// If user has confirmed email, they can logout (can log back in with email/password or magic link)
		// If no email or email not confirmed, prevent logout
		if (!hasEmail || !emailConfirmed) {
			setShowLogoutWarning(true)
			return
		}

		// User has upgraded account (email confirmed), proceed with logout
		const supabase = createClientSupabaseClient()
		await supabase.auth.signOut()
		router.push("/login")
		router.refresh()
	}

	const handleGoToSettings = () => {
		setShowLogoutWarning(false)
		router.push("/settings")
	}

	if (loading) {
		return (
			<div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
		)
	}

	if (!user) {
		return null
	}

	const isAnonymous = user.is_anonymous || !user.email
	const userEmail = user.email || ""
	const firstName = user.user_metadata?.first_name || ""
	const lastName = user.user_metadata?.last_name || ""
	const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || ""
	const userName = fullName || userEmail.split("@")[0] || "User"
	const userInitials = userName
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
	const avatarUrl = user.user_metadata?.avatar_url || null

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
						<Avatar className="h-8 w-8 cursor-pointer">
							<AvatarImage src={avatarUrl || undefined} alt={userName} />
							<AvatarFallback className="bg-primary text-primary-foreground text-xs">
								{userInitials}
							</AvatarFallback>
						</Avatar>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuLabel>
						<div className="flex flex-col space-y-1">
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium leading-none">{userName}</p>
								{isAnonymous && (
									<span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
										Anonymous
									</span>
								)}
							</div>
							<p className="text-xs leading-none text-muted-foreground">
								{userEmail || "No email"}
							</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem asChild>
						<Link href="/settings" className="cursor-pointer">
							<Settings className="mr-2 h-4 w-4" />
							<span>Settings</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={handleLogout}
						className="cursor-pointer text-destructive focus:text-destructive"
					>
						<LogOut className="mr-2 h-4 w-4" />
						<span>Log out</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<div className="flex items-start gap-4">
							<div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
								<AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
							</div>
							<div className="flex-1">
								<DialogTitle className="text-xl">Cannot Log Out</DialogTitle>
								<DialogDescription className="mt-2">
									Your account is not fully set up yet. If you log out now, you'll lose access to your account permanently.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm text-muted-foreground">
							Please upgrade your account by adding an email and password in Settings before logging out. This will allow you to log back in later.
						</p>
					</div>
					<DialogFooter className="sm:justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => setShowLogoutWarning(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleGoToSettings}
							autoFocus
						>
							Go to Settings
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

