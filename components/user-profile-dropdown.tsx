"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function UserProfileDropdown() {
	const [user, setUser] = useState<SupabaseUser | null>(null)
	const [loading, setLoading] = useState(true)
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
		const supabase = createClientSupabaseClient()
		await supabase.auth.signOut()
		router.push("/login")
		router.refresh()
	}

	if (loading) {
		return (
			<div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
		)
	}

	if (!user) {
		return null
	}

	const userEmail = user.email || ""
	const userName = user.user_metadata?.name || userEmail.split("@")[0] || "User"
	const userInitials = userName
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
	const avatarUrl = user.user_metadata?.avatar_url || null

	return (
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
						<p className="text-sm font-medium leading-none">{userName}</p>
						<p className="text-xs leading-none text-muted-foreground">
							{userEmail}
						</p>
					</div>
				</DropdownMenuLabel>
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
	)
}

