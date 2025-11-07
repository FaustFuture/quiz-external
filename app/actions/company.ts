"use server"

import { supabase } from "@/lib/supabase"
import { uploadImageToStorage } from "@/app/actions/storage"
import { revalidatePath } from "next/cache"

export type Company = {
  id: string
  company_id: string
  name: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export async function getCompany(companyId: string): Promise<Company | null> {
  try {
    console.log("Fetching company for ID:", companyId)
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("company_id", companyId)
      .single()

    if (error) {
      // Check if it's a table not found error
      if (error.code === 'PGRST116' || error.message?.includes('relation "companies" does not exist')) {
        console.log("Companies table doesn't exist yet, returning null")
        return null
      }
      console.error("Error fetching company:", error)
      return null
    }

    console.log("Company data fetched:", data)
    return data
  } catch (error) {
    console.error("Error fetching company:", error)
    return null
  }
}

export async function createOrUpdateCompany(companyId: string, name: string, logoUrl?: string) {
  try {
    const { data, error } = await supabase
      .from("companies")
      .upsert({
        company_id: companyId,
        name,
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      })
      .select()
      .single()

    if (error) {
      // Check if it's a table not found error
      if (error.code === 'PGRST116' || error.message?.includes('relation "companies" does not exist')) {
        console.log("Companies table doesn't exist yet, cannot create company record")
        return { success: false, error: "Companies table not set up yet. Please run the SQL migration first." }
      }
      console.error("Error creating/updating company:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${companyId}`, "page")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating/updating company:", error)
    return { success: false, error: "Failed to create/update company" }
  }
}

export async function updateCompanyLogo(companyId: string, logoUrl: string) {
  try {
    const { error } = await supabase
      .from("companies")
      .update({ 
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      })
      .eq("company_id", companyId)

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
