"use server"

import { supabaseAdmin } from "@/lib/supabase"

export type GuestAccount = {
	guest_id: string
	name: string
	email: string | null
	created_at: string
}

/**
 * Create a new guest account and return the guest_id
 */
export async function createGuestAccount(name: string, email?: string): Promise<{ success: boolean; data?: GuestAccount; error?: string }> {
	try {
		const { data, error } = await supabaseAdmin
			.from("guest_accounts")
			.insert({
				name: name.trim(),
				email: email?.trim() || null,
			})
			.select()
			.single()

		if (error) {
			console.error("Error creating guest account:", error)
			return { success: false, error: error.message }
		}

		return { success: true, data: data as GuestAccount }
	} catch (error) {
		console.error("Error creating guest account:", error)
		return { success: false, error: "Failed to create guest account" }
	}
}

/**
 * Get a guest account by guest_id
 */
export async function getGuestAccount(guestId: string): Promise<GuestAccount | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from("guest_accounts")
			.select("*")
			.eq("guest_id", guestId)
			.maybeSingle()

		if (error) {
			console.error("Error fetching guest account:", error)
			return null
		}

		return data as GuestAccount | null
	} catch (error) {
		console.error("Error fetching guest account:", error)
		return null
	}
}

