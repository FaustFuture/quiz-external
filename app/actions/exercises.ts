"use server"

import { supabase, supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export type Exercise = {
  id: string
  module_id: string
  question: string
  image_url: string | null
  image_urls?: string[] | null
  video_url?: string | null
  image_display_size: string
  image_layout: 'grid' | 'carousel' | 'vertical' | 'horizontal'
  weight: number
  order: number
  created_at: string
}

export async function createExercise(
  moduleId: string, 
  question: string, 
  imageUrl: string = "", 
  weight: number = 1
) {
  try {
    // Get the highest order number for this module
    const { data: existingExercises } = await supabase
      .from("exercises")
      .select("order")
      .eq("module_id", moduleId)
      .order("order", { ascending: false })
      .limit(1)

    const nextOrder = existingExercises && existingExercises.length > 0 
      ? existingExercises[0].order + 1 
      : 0

    const { data, error } = await supabase
      .from("exercises")
      .insert({
        module_id: moduleId,
        question,
        image_url: imageUrl || null,
        image_urls: null,
        video_url: null,
        image_layout: 'grid',
        weight,
        order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating exercise:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating exercise:", error)
    return { success: false, error: "Failed to create exercise" }
  }
}

export async function getExercises(moduleId: string): Promise<Exercise[]> {
  try {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("module_id", moduleId)
      .order("order", { ascending: true })

    if (error) {
      console.error("Error fetching exercises:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching exercises:", error)
    return []
  }
}

export async function updateExerciseOrder(
  exerciseId: string, 
  newOrder: number, 
  moduleId: string
) {
  try {
    const { error } = await supabase
      .from("exercises")
      .update({ order: newOrder })
      .eq("id", exerciseId)
      .eq("module_id", moduleId)

    if (error) {
      console.error("Error updating exercise order:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error updating exercise order:", error)
    return { success: false, error: "Failed to update exercise order" }
  }
}

export async function updateExercise(
  exerciseId: string,
  moduleId: string,
  updates: { question?: string; image_url?: string; image_urls?: string[] | null; video_url?: string; image_layout?: string }
) {
  try {
    const { data, error } = await supabase
      .from("exercises")
      .update(updates)
      .eq("id", exerciseId)
      .eq("module_id", moduleId)
      .select()
      .single()

    if (error) {
      console.error("Error updating exercise:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true, data }
  } catch (error) {
    console.error("Error updating exercise:", error)
    return { success: false, error: "Failed to update exercise" }
  }
}

export async function updateExerciseImageDisplaySize(
  exerciseId: string, 
  moduleId: string, 
  imageDisplaySize: string
) {
  try {
    const { error } = await supabase
      .from("exercises")
      .update({ image_display_size: imageDisplaySize })
      .eq("id", exerciseId)
      .eq("module_id", moduleId)

    if (error) {
      console.error("Error updating image display size:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error updating image display size:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateExerciseImageLayout(
  exerciseId: string, 
  moduleId: string, 
  imageLayout: string
) {
  try {
    const { error } = await supabase
      .from("exercises")
      .update({ image_layout: imageLayout })
      .eq("id", exerciseId)
      .eq("module_id", moduleId)

    if (error) {
      console.error("Error updating image layout:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error updating image layout:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteExercise(exerciseId: string, moduleId: string) {
  try {
    console.log('Attempting to delete exercise:', exerciseId, 'from module:', moduleId)
    
    // Use the nuclear deletion function
    const { error } = await supabaseAdmin.rpc('delete_exercise_nuclear', {
      exercise_id_param: exerciseId,
      module_id_param: moduleId
    })

    if (error) {
      console.error("Error deleting exercise:", error)
      return { success: false, error: error.message }
    }

    console.log('Exercise deleted successfully')
    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error deleting exercise:", error)
    return { success: false, error: "Failed to delete exercise" }
  }
}
