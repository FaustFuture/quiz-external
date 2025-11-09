"use server"

import { supabaseAdmin } from "@/lib/supabase"

export async function uploadImageToStorage(
  file: File,
  bucketName: string = "images"
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Upload to Supabase Storage using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error("Error uploading to storage:", error)
      
      // Provide more specific error messages
      if (error.message.includes('not found') || error.message.includes('Bucket not found')) {
        return { 
          success: false, 
          error: `Storage bucket "${bucketName}" does not exist. Please create it in Supabase Dashboard.` 
        }
      }
      if (error.message.includes('exceeded')) {
        return { 
          success: false, 
          error: 'Storage quota exceeded. Please contact your administrator.' 
        }
      }
      if (error.message.includes('policy')) {
        return { 
          success: false, 
          error: 'Storage permission denied. Please check bucket policies.' 
        }
      }
      
      return { success: false, error: error.message }
    }

    // Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      return { 
        success: false, 
        error: 'Failed to generate public URL for uploaded file' 
      }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error: any) {
    console.error("Error in uploadImageToStorage:", error)
    
    // Handle specific error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { 
        success: false, 
        error: 'Cannot connect to storage server. Please check your internet connection.' 
      }
    }
    
    return { 
      success: false, 
      error: error.message || "Failed to upload image" 
    }
  }
}

export async function deleteImageFromStorage(
  imageUrl: string,
  bucketName: string = "images"
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    if (!fileName) {
      return { success: false, error: "Invalid image URL" }
    }

    // Delete from Supabase Storage using admin client
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([fileName])

    if (error) {
      console.error("Error deleting from storage:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteImageFromStorage:", error)
    return { success: false, error: "Failed to delete image" }
  }
}

export async function validateImageUrl(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Basic URL validation
    new URL(url)
    
    // Try to fetch the image to validate it exists and is an image
    const response = await fetch(url, { method: 'HEAD' })
    
    if (!response.ok) {
      return { success: false, error: "Image not accessible" }
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      return { success: false, error: "URL does not point to an image" }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error validating image URL:", error)
    return { success: false, error: "Invalid URL format" }
  }
}
