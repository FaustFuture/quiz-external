"use server"

import { supabase, supabaseAdmin } from "@/lib/supabase"
import { uploadImageToStorage } from "@/app/actions/storage"
import { revalidatePath } from "next/cache"
import { createHash } from "crypto"

export type Company = {
	id: string
	name: string
	logo_url: string | null
	owner_user_id: string | null
	invitation_token: string | null
	created_at: string
	updated_at: string
}

export type CompanyMembership = {
	id: string
	company_id: string
	user_id: string
	role: 'admin' | 'member'
	joined_at: string
}

export async function getCompany(companyId: string): Promise<Company | null> {
	try {
		console.log("[getCompany] Fetching company data for:", companyId)
		const { data, error } = await supabaseAdmin
			.from("companies")
			.select("*")
			.eq("id", companyId)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				console.log("[getCompany] Company not found:", companyId)
				return null
			}
			console.error("[getCompany] Error fetching company:", error)
			return null
		}

		console.log("[getCompany] Company data retrieved:", data?.name, "Logo URL:", data?.logo_url)
		return data
	} catch (error) {
		console.error("[getCompany] Exception:", error)
		return null
	}
}

export async function getUserCompanies(userId: string): Promise<Company[]> {
	try {
		console.log("[getUserCompanies] Fetching companies for user:", userId);

		// First get the company IDs the user belongs to
		const { data: memberships, error: membershipError } = await supabaseAdmin
			.from("companies_users")
			.select("company_id, role")
			.eq("user_id", userId);

		console.log("[getUserCompanies] Memberships result:", { memberships, membershipError });

		if (membershipError) {
			console.error("[getUserCompanies] Error fetching memberships:", membershipError);
			return [];
		}

		if (!memberships || memberships.length === 0) {
			console.log("[getUserCompanies] No memberships found");
			return [];
		}

		// Get the company IDs
		const companyIds = memberships.map((m: any) => m.company_id);
		console.log("[getUserCompanies] Company IDs:", companyIds);

		// Fetch the actual company data
		const { data: companies, error: companiesError } = await supabaseAdmin
			.from("companies")
			.select("*")
			.in("id", companyIds);

		console.log("[getUserCompanies] Companies result:", { companies, companiesError });

		if (companiesError) {
			console.error("[getUserCompanies] Error fetching companies:", companiesError);
			return [];
		}

		console.log("[getUserCompanies] Returning companies:", companies || []);
		return companies || [];
	} catch (error) {
		console.error("[getUserCompanies] Exception:", error);
		return [];
	}
}

export async function createCompany(name: string, userId: string) {
	try {
		console.log("[createCompany] Creating company:", name, "for user:", userId);

		const companyId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

		console.log("[createCompany] Generated company ID:", companyId);

		const { data: company, error: companyError } = await supabaseAdmin
			.from("companies")
			.insert({
				id: companyId,
				name,
				owner_user_id: userId
			})
			.select()
			.single()

		if (companyError) {
			console.error("[createCompany] Error creating company:", companyError)
			return { success: false, error: companyError.message }
		}

		console.log("[createCompany] Company created:", company);
		console.log("[createCompany] Creating membership with role: admin");

		const { error: membershipError } = await supabaseAdmin
			.from("companies_users")
			.insert({
				company_id: companyId,
				user_id: userId,
				role: 'admin'
			})

		if (membershipError) {
			console.error("[createCompany] Error creating company membership:", membershipError)
			await supabaseAdmin.from("companies").delete().eq("id", companyId)
			return { success: false, error: membershipError.message }
		}

		console.log("[createCompany] Membership created successfully");

		// Generate invitation token for the new company
		await generateInvitationToken(companyId)

		revalidatePath("/onboarding")
		revalidatePath(`/dashboard/${companyId}`)
		return { success: true, data: company }
	} catch (error: any) {
		console.error("[createCompany] Exception:", error)
		return { success: false, error: error.message || "Failed to create company" }
	}
}

export async function joinCompany(companyId: string, userId: string) {
	try {

		const { data: company, error: companyError } = await supabase
			.from("companies")
			.select("*")
			.eq("id", companyId)
			.single()

		if (companyError || !company) {
			return { success: false, error: "Company not found" }
		}

		const { error: membershipError } = await supabaseAdmin
			.from("companies_users")
			.insert({
				company_id: companyId,
				user_id: userId,
				role: 'member'
			})

		if (membershipError) {
			if (membershipError.code === '23505') {
				return { success: false, error: "You are already a member of this company" }
			}
			console.error("Error joining company:", membershipError)
			return { success: false, error: membershipError.message }
		}

		revalidatePath("/onboarding")
		revalidatePath(`/dashboard/${companyId}`)
		return { success: true, data: company }
	} catch (error: any) {
		console.error("Error joining company:", error)
		return { success: false, error: error.message || "Failed to join company" }
	}
}

export async function createOrUpdateCompany(companyId: string, name: string, logoUrl?: string) {
	try {
		const { data, error } = await supabaseAdmin
			.from("companies")
			.upsert({
				id: companyId,
				name,
				logo_url: logoUrl || null,
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'id'
			})
			.select()
			.single()

		if (error) {
			console.error("Error creating/updating company:", error)
			return { success: false, error: error.message }
		}

		// Note: revalidatePath removed - this function is called during render
		// If you need revalidation, call it from a client action after a user interaction
		return { success: true, data }
	} catch (error) {
		console.error("Error creating/updating company:", error)
		return { success: false, error: "Failed to create/update company" }
	}
}

export async function updateCompanyLogo(companyId: string, logoUrl: string) {
	try {
		const { error } = await supabaseAdmin
			.from("companies")
			.update({
				logo_url: logoUrl,
				updated_at: new Date().toISOString()
			})
			.eq("id", companyId)

		if (error) {
			console.error("Error updating company logo:", error)
			return { success: false, error: error.message }
		}

		revalidatePath(`/dashboard/${companyId}`, "page")
		return { success: true }
	} catch (error) {
		console.error("Error updating company logo:", error)
		return { success: false, error: "Failed to update company logo" }
	}
}

export async function uploadCompanyLogo(companyId: string, file: File) {
	try {
		// Upload the image to storage
		const uploadResult = await uploadImageToStorage(file, "company-logos")

		if (!uploadResult.success || !uploadResult.url) {
			return { success: false, error: uploadResult.error || "Failed to upload logo" }
		}

		// Update the company record with the new logo URL
		const updateResult = await updateCompanyLogo(companyId, uploadResult.url)

		if (!updateResult.success) {
			// If it's a table not found error, we can still return the URL
			// The logo will be uploaded but not saved to database
			if (updateResult.error?.includes("Companies table not set up")) {
				console.log("Logo uploaded but not saved to database - table not set up")
				return { success: true, url: uploadResult.url, warning: "Logo uploaded but database not set up yet" }
			}
			return { success: false, error: updateResult.error }
		}

		return { success: true, url: uploadResult.url }
	} catch (error) {
		console.error("Error uploading company logo:", error)
		return { success: false, error: "Failed to upload company logo" }
	}
}

/**
 * Generate a permanent invitation token for a company
 * Token is based on company_id + secret key, hashed and base64url encoded
 */
export async function generateInvitationToken(companyId: string): Promise<{ success: boolean; token?: string; error?: string }> {
	try {
		// Check if token already exists
		const { data: existingCompany } = await supabaseAdmin
			.from("companies")
			.select("invitation_token")
			.eq("id", companyId)
			.single()

		if (existingCompany?.invitation_token) {
			return { success: true, token: existingCompany.invitation_token }
		}

		// Generate token: hash(company_id + secret_key) -> base64url
		const secretKey = process.env.INVITATION_SECRET_KEY || "default-secret-key-change-in-production"
		const tokenData = `${companyId}:${secretKey}`
		const hash = createHash("sha256").update(tokenData).digest()
		const token = Buffer.from(hash).toString("base64url").slice(0, 32) // Use first 32 chars for cleaner URL

		// Store token in database
		const { error } = await supabaseAdmin
			.from("companies")
			.update({ invitation_token: token })
			.eq("id", companyId)

		if (error) {
			console.error("[generateInvitationToken] Error storing token:", error)
			return { success: false, error: error.message }
		}

		return { success: true, token }
	} catch (error: any) {
		console.error("[generateInvitationToken] Exception:", error)
		return { success: false, error: error.message || "Failed to generate invitation token" }
	}
}

/**
 * Get company by invitation token
 */
export async function getCompanyByInvitationToken(token: string): Promise<{ success: boolean; company?: Company; error?: string }> {
	try {
		const { data, error } = await supabaseAdmin
			.from("companies")
			.select("*")
			.eq("invitation_token", token)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				return { success: false, error: "Invalid invitation link" }
			}
			console.error("[getCompanyByInvitationToken] Error:", error)
			return { success: false, error: error.message }
		}

		if (!data) {
			return { success: false, error: "Company not found" }
		}

		return { success: true, company: data as Company }
	} catch (error: any) {
		console.error("[getCompanyByInvitationToken] Exception:", error)
		return { success: false, error: error.message || "Failed to get company by token" }
	}
}

/**
 * Join company via invitation token
 */
export async function joinCompanyViaInvitation(token: string, userId: string): Promise<{ success: boolean; company?: Company; error?: string }> {
	try {
		// Get company by token
		const companyResult = await getCompanyByInvitationToken(token)
		if (!companyResult.success || !companyResult.company) {
			return { success: false, error: companyResult.error || "Invalid invitation link" }
		}

		const company = companyResult.company

		// Check if user is already a member
		const { data: existingMembership } = await supabaseAdmin
			.from("companies_users")
			.select("id")
			.eq("company_id", company.id)
			.eq("user_id", userId)
			.single()

		if (existingMembership) {
			// Already a member, return success
			return { success: true, company }
		}

		// Join company
		const { error: membershipError } = await supabaseAdmin
			.from("companies_users")
			.insert({
				company_id: company.id,
				user_id: userId,
				role: 'member'
			})

		if (membershipError) {
			console.error("[joinCompanyViaInvitation] Error joining:", membershipError)
			return { success: false, error: membershipError.message }
		}

		revalidatePath(`/dashboard/${company.id}`)
		return { success: true, company }
	} catch (error: any) {
		console.error("[joinCompanyViaInvitation] Exception:", error)
		return { success: false, error: error.message || "Failed to join company" }
	}
}
