"use server"

import { supabase, supabaseAdmin } from "@/lib/supabase"

export type CachedUser = {
	id: string
	auth_user_id: string
	name: string | null
	email: string | null
	avatar_url: string | null
	created_at: string
}

// No longer needed - Supabase auth handles users automatically
export async function upsertUsersFromSupabase(userIds: string[]) {
	if (!Array.isArray(userIds) || userIds.length === 0) return { success: true }
	const unique = Array.from(new Set(userIds))
	const users: any[] = []

	// Fetch user data from Supabase auth
	for (const id of unique) {
		try {
			const { data: user } = await supabaseAdmin.auth.admin.getUserById(id)
			if (user?.user) {
				// Build name from first_name and last_name, or fallback to name or email
				const firstName = user.user.user_metadata?.first_name || ""
				const lastName = user.user.user_metadata?.last_name || ""
				const fullName = firstName && lastName
					? `${firstName} ${lastName}`.trim()
					: firstName || lastName || user.user.user_metadata?.name || user.user.email?.split('@')[0] || null

				users.push({
					auth_user_id: id,
					name: fullName,
					email: user.user.email || null,
					avatar_url: user.user.user_metadata?.avatar_url || null,
				})
			}
		} catch (e) {
			// Fallback: ensure we at least cache the ID so relations work
			users.push({
				auth_user_id: id,
				name: null,
				email: null,
				avatar_url: null,
			})
		}
	}
	if (users.length === 0) return { success: false, error: "No valid users" }

	const { error } = await supabaseAdmin
		.from("users")
		.upsert(users, { onConflict: "auth_user_id" })

	if (error) return { success: false, error: error.message }
	return { success: true }
}

export async function resolveEmailsToIds(emails: string[]) {
	if (!Array.isArray(emails) || emails.length === 0) return { success: false, error: "No emails provided" }
	const unique = Array.from(new Set(emails.map(e => (e || "").trim().toLowerCase()).filter(Boolean)))
	const userIds: string[] = []

	// Look up users by email in Supabase auth
	for (const email of unique) {
		try {
			const { data, error } = await supabaseAdmin.auth.admin.listUsers()
			if (data?.users) {
				const user = data.users.find((u: any) => u.email?.toLowerCase() === email)
				if (user) {
					userIds.push(user.id)
				}
			}
		} catch (e) {
			console.error(`Failed to resolve email ${email}:`, e)
		}
	}

	if (userIds.length === 0) return { success: false, error: "No valid emails found" }
	return { success: true, data: Array.from(new Set(userIds)) }
}

export async function getCachedUsersByIds(userIds: string[]) {
	if (userIds.length === 0) return []
	const { data } = await supabaseAdmin
		.from("users")
		.select("*")
		.in("auth_user_id", userIds)
	return data || []
}

export async function grantExamRetake(moduleId: string, userIds: string[], grantedBy: string) {
	try {
		// Ensure users are cached
		await upsertUsersFromSupabase(userIds)

		const rows = userIds.map((uid) => ({
			module_id: moduleId,
			user_id: uid,
			granted_by: grantedBy,
			used_at: null // Reset used_at to null when granting/re-granting
		}))
		// Use upsert with onConflict to handle duplicates - if grant already exists, update granted_at and reset used_at to null
		const { error } = await supabaseAdmin
			.from("exam_retakes")
			.upsert(rows, {
				onConflict: "module_id,user_id",
				ignoreDuplicates: false
			})
			.select()

		if (error) {
			console.error("Error granting retake:", error)
			return { success: false, error: error.message }
		}
		return { success: true }
	} catch (e: any) {
		console.error("Exception granting retake:", e)
		return { success: false, error: e?.message || "Failed to grant retake" }
	}
}

export async function grantExamRetakeByEmails(moduleId: string, emails: string[], grantedBy: string) {
	try {
		// Resolve emails to user IDs
		const resolveResult = await resolveEmailsToIds(emails)
		if (!resolveResult.success) {
			return { success: false, error: resolveResult.error }
		}

		const userIds = resolveResult.data || []
		if (userIds.length === 0) {
			return { success: false, error: "No valid emails found" }
		}

		// Grant retakes using the resolved user IDs
		return await grantExamRetake(moduleId, userIds, grantedBy)
	} catch (e) {
		return { success: false, error: "Failed to grant retake" }
	}
}

export async function searchCachedUsers(query: string, limit: number = 10) {
	try {
		const q = (query || "").trim()
		if (!q) return { success: true, data: [] }

		const { data, error } = await supabaseAdmin
			.from("users")
			.select("auth_user_id, name, email")
			.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
			.limit(limit)

		if (error) return { success: false, error: error.message, data: [] }
		return { success: true, data: data || [] }
	} catch (e) {
		return { success: false, error: "Failed to search users", data: [] }
	}
}

export async function hasExamRetakeAccess(moduleId: string, userId: string) {
	try {
		const { data, error } = await supabase
			.from("exam_retakes")
			.select("id, used_at")
			.eq("module_id", moduleId)
			.eq("user_id", userId)
			.single()

		if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
			return { success: false, error: error.message }
		}

		// If no retake record found, user doesn't have access
		if (!data) return { success: true, data: false }

		// If retake exists and hasn't been used, user has access
		return { success: true, data: !data.used_at }
	} catch (e) {
		return { success: false, error: "Failed to check retake access" }
	}
}

export async function listExamRetakes(moduleId: string) {
	try {
		// Fetch raw grants first
		const { data: grants, error: gErr } = await supabaseAdmin
			.from("exam_retakes")
			.select("id, user_id, granted_by, granted_at, used_at")
			.eq("module_id", moduleId)
			.order("granted_at", { ascending: false })
		if (gErr) return { success: false, error: gErr.message, data: [] }

		const userIds = Array.from(new Set((grants || []).map((g: any) => g.user_id)))
		let usersById: Record<string, any> = {}
		if (userIds.length > 0) {
			const { data: usersData } = await supabaseAdmin
				.from("users")
				.select("auth_user_id, name, email, avatar_url")
				.in("auth_user_id", userIds)
			for (const u of usersData || []) usersById[u.auth_user_id] = u
		}

		const rows = (grants || []).map((r: any) => ({
			id: r.id,
			user_id: r.user_id,
			email: usersById[r.user_id]?.email || null,
			name: usersById[r.user_id]?.name || null,
			granted_at: r.granted_at,
			used_at: r.used_at || null,
		}))
		return { success: true, data: rows }
	} catch (e) {
		return { success: false, error: "Failed to list exam retakes", data: [] }
	}
}

export async function getUserRetakeGrants(userId: string) {
	try {
		const { data, error } = await supabase
			.from("exam_retakes")
			.select("module_id, used_at")
			.eq("user_id", userId)
			.is("used_at", null)

		if (error) return { success: false, error: error.message, data: [] }
		const moduleIds = (data || []).map((r: any) => r.module_id)
		return { success: true, data: moduleIds }
	} catch (e) {
		return { success: false, error: "Failed to read retake grants", data: [] }
	}
}

// Ensure a user is saved to the users table
// This should be called after signup/login to cache user data
export async function ensureUserInDatabase(userId: string) {
	try {
		// Check if user already exists in users table
		const { data: existingUser } = await supabaseAdmin
			.from("users")
			.select("auth_user_id")
			.eq("auth_user_id", userId)
			.single()

		// If user already exists, no need to do anything
		if (existingUser) {
			return { success: true, alreadyExists: true }
		}

		// User doesn't exist, fetch from auth and save
		const result = await upsertUsersFromSupabase([userId])
		return result
	} catch (e: any) {
		console.error('Error ensuring user in database:', e)
		return { success: false, error: e?.message || 'Failed to save user' }
	}
}

export async function checkEmailExists(email: string) {
	try {
		const normalizedEmail = email.trim().toLowerCase()
		if (!normalizedEmail) return { success: false, exists: false }

		// First, try to check in the cached users table using regular client
		// This works if RLS allows public read access
		const { data: cachedUsers, error: cacheError } = await supabase
			.from('users')
			.select('email')
			.ilike('email', normalizedEmail)
			.limit(1)

		if (!cacheError && cachedUsers && cachedUsers.length > 0) {
			return { success: true, exists: true }
		}

		// If not found in cache and service role key is available, try admin API
		// Check if service key exists and is valid before attempting
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
		if (serviceKey && serviceKey.trim().length > 0) {
			try {
				const { data, error } = await supabaseAdmin.auth.admin.listUsers()
				if (!error && data?.users) {
					const exists = data.users.some(
						(user: any) => user.email?.toLowerCase() === normalizedEmail
					)
					return { success: true, exists }
				}
			} catch (adminError: any) {
				// Admin API failed - likely service key not set or invalid
				// Don't log repeatedly - this is expected if service key isn't configured
				if (adminError?.message?.includes('API key') || adminError?.status === 401) {
					// Silently fail - we'll rely on Supabase's built-in duplicate prevention
					return { success: true, exists: false }
				}
				// For other errors, log once
				console.warn('Admin API check failed:', adminError?.message || adminError)
			}
		}

		// Fallback: return false (email doesn't exist or we can't check)
		// This is safe - Supabase will still prevent duplicate signups
		return { success: true, exists: false }
	} catch (e) {
		console.error('Exception checking email:', e)
		// On error, return false to allow signup attempt
		// Supabase will handle duplicate prevention
		return { success: false, exists: false }
	}
}

/**
 * Update user profile (email, first name, last name)
 * For anonymous users, this upgrades their account by adding email
 */
export async function updateUserProfile(
	email: string,
	firstName?: string,
	lastName?: string
): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> {
	try {
		const { createServerSupabaseClient } = await import("@/lib/supabase-server")
		const supabase = await createServerSupabaseClient()

		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			return { success: false, error: "User not authenticated" }
		}

		// Check if email is being changed and if it already exists
		if (email && email !== user.email) {
			const emailCheck = await checkEmailExists(email)
			if (emailCheck.success && emailCheck.exists) {
				return { success: false, error: "This email address is already registered" }
			}
		}

		// Prepare user metadata
		const metadata: Record<string, any> = { ...user.user_metadata }
		if (firstName !== undefined) {
			metadata.first_name = firstName || null
		}
		if (lastName !== undefined) {
			metadata.last_name = lastName || null
		}

		// Update user
		const updateData: any = {
			data: metadata
		}

		// If email is provided and different, add it (will require confirmation)
		if (email && email !== user.email) {
			updateData.email = email
		}

		const { error } = await supabase.auth.updateUser(updateData)

		if (error) {
			console.error("[updateUserProfile] Error:", error)
			return { success: false, error: error.message }
		}

		// Update cached user in database - refresh user data first
		// Get fresh user data after update to ensure we have latest metadata
		const { data: { user: updatedUser } } = await supabase.auth.getUser()
		if (updatedUser) {
			await upsertUsersFromSupabase([updatedUser.id])
		} else {
			// Fallback to original user ID if refresh fails
			await upsertUsersFromSupabase([user.id])
		}

		// If email was changed, it requires confirmation
		const requiresEmailConfirmation = email && email !== user.email

		return {
			success: true,
			requiresEmailConfirmation
		}
	} catch (error: any) {
		console.error("[updateUserProfile] Exception:", error)
		return { success: false, error: error.message || "Failed to update profile" }
	}
}

/**
 * Upgrade anonymous account by adding email and password
 */
export async function upgradeAnonymousAccount(
	email: string,
	password: string,
	firstName?: string,
	lastName?: string
): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> {
	try {
		const { createServerSupabaseClient } = await import("@/lib/supabase-server")
		const supabase = await createServerSupabaseClient()

		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			return { success: false, error: "User not authenticated" }
		}

		// Check if user is actually anonymous
		if (user.email && !user.is_anonymous) {
			return { success: false, error: "Account is not anonymous" }
		}

		// Check if email already exists
		const emailCheck = await checkEmailExists(email)
		if (emailCheck.success && emailCheck.exists) {
			return { success: false, error: "This email address is already registered" }
		}

		// Prepare user metadata
		const metadata: Record<string, any> = { ...user.user_metadata }
		if (firstName) metadata.first_name = firstName
		if (lastName) metadata.last_name = lastName

		// Update user with email (this will send confirmation email)
		const { error: updateError } = await supabase.auth.updateUser({
			email,
			data: metadata
		})

		if (updateError) {
			console.error("[upgradeAnonymousAccount] Error updating email:", updateError)
			return { success: false, error: updateError.message }
		}

		// Note: Password can only be set after email is confirmed
		// We'll need to handle password setting separately after email confirmation
		// For now, return that email confirmation is required

		// Update cached user in database - refresh user data first
		// Get fresh user data after update to ensure we have latest metadata
		const { data: { user: updatedUser } } = await supabase.auth.getUser()
		if (updatedUser) {
			await upsertUsersFromSupabase([updatedUser.id])
		} else {
			// Fallback to original user ID if refresh fails
			await upsertUsersFromSupabase([user.id])
		}

		return {
			success: true,
			requiresEmailConfirmation: true
		}
	} catch (error: any) {
		console.error("[upgradeAnonymousAccount] Exception:", error)
		return { success: false, error: error.message || "Failed to upgrade account" }
	}
}

/**
 * Update user password
 */
export async function updateUserPassword(
	newPassword: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const { createServerSupabaseClient } = await import("@/lib/supabase-server")
		const supabase = await createServerSupabaseClient()

		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			return { success: false, error: "User not authenticated" }
		}

		const { error } = await supabase.auth.updateUser({
			password: newPassword
		})

		if (error) {
			console.error("[updateUserPassword] Error:", error)
			return { success: false, error: error.message }
		}

		// Update cached user in database
		await upsertUsersFromSupabase([user.id])

		return { success: true }
	} catch (error: any) {
		console.error("[updateUserPassword] Exception:", error)
		return { success: false, error: error.message || "Failed to update password" }
	}
}

/**
 * Set password for anonymous user after email confirmation
 */
export async function setPasswordForUpgradedAccount(
	password: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const { createServerSupabaseClient } = await import("@/lib/supabase-server")
		const supabase = await createServerSupabaseClient()

		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			return { success: false, error: "User not authenticated" }
		}

		// Check if email is confirmed
		if (!user.email_confirmed_at) {
			return { success: false, error: "Please confirm your email address first" }
		}

		const { error } = await supabase.auth.updateUser({
			password
		})

		if (error) {
			console.error("[setPasswordForUpgradedAccount] Error:", error)
			return { success: false, error: error.message }
		}

		// Update cached user in database - refresh user data first
		const { data: { user: updatedUser } } = await supabase.auth.getUser()
		if (updatedUser) {
			await upsertUsersFromSupabase([updatedUser.id])
		} else {
			// Fallback to original user ID if refresh fails
			await upsertUsersFromSupabase([user.id])
		}

		return { success: true }
	} catch (error: any) {
		console.error("[setPasswordForUpgradedAccount] Exception:", error)
		return { success: false, error: error.message || "Failed to set password" }
	}
}


