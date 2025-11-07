"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export type Module = {
  id: string
  company_id: string
  title: string
  description: string | null
  order: number
  created_at: string
  type: 'module' | 'exam'
  is_unlocked: boolean
}

export async function createModule(companyId: string, title: string, description: string, type: 'module' | 'exam' = 'module') {
  try {
    // Get the highest order number for this company
    const { data: existingModules } = await supabase
      .from("modules")
      .select("order")
      .eq("company_id", companyId)
      .order("order", { ascending: false })
      .limit(1)

    const nextOrder = existingModules && existingModules.length > 0 
      ? existingModules[0].order + 1 
      : 0

    const { data, error } = await supabase
      .from("modules")
      .insert({
        company_id: companyId,
        title,
        description,
        order: nextOrder,
        type,
        is_unlocked: type === 'module' ? true : false, // Modules are always unlocked, exams start locked
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating module:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${companyId}`, "page")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating module:", error)
    return { success: false, error: "Failed to create module" }
  }
}

export async function getModules(companyId: string): Promise<Module[]> {
  try {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching modules:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching modules:", error)
    return []
  }
}

export async function updateModuleOrder(moduleId: string, newOrder: number, companyId: string) {
  try {
    // Get all modules for this company
    const { data: allModules, error: fetchError } = await supabase
      .from("modules")
      .select("id, order")
      .eq("company_id", companyId)
      .order("order", { ascending: true })

    if (fetchError) {
      console.error("Error fetching modules:", fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!allModules) {
      return { success: false, error: "No modules found" }
    }

    // Find the module being moved
    const oldIndex = allModules.findIndex(m => m.id === moduleId)
    if (oldIndex === -1) {
      return { success: false, error: "Module not found" }
    }

    // Create new order array
    const newOrderArray = [...allModules]
    const [movedModule] = newOrderArray.splice(oldIndex, 1)
    newOrderArray.splice(newOrder, 0, movedModule)

    // First, set all modules to temporary large order values to avoid conflicts
    const tempOrderStart = 10000 // Use large numbers that won't conflict
    for (let i = 0; i < allModules.length; i++) {
      const { error } = await supabase
        .from("modules")
        .update({ order: tempOrderStart + i })
        .eq("id", allModules[i].id)
        .eq("company_id", companyId)

      if (error) {
        console.error("Error setting temporary order:", error)
        return { success: false, error: error.message }
      }
    }

    // Then update all modules with their final order values
    for (let i = 0; i < newOrderArray.length; i++) {
      const { error } = await supabase
        .from("modules")
        .update({ order: i })
        .eq("id", newOrderArray[i].id)
        .eq("company_id", companyId)

      if (error) {
        console.error("Error updating module order:", error)
        return { success: false, error: error.message }
      }
    }

    revalidatePath(`/dashboard/${companyId}`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error updating module order:", error)
    return { success: false, error: "Failed to update module order" }
  }
}

export async function deleteModule(moduleId: string, companyId: string) {
  try {
    const { error } = await supabase
      .from("modules")
      .delete()
      .eq("id", moduleId)
      .eq("company_id", companyId)

    if (error) {
      console.error("Error deleting module:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${companyId}`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error deleting module:", error)
    return { success: false, error: "Failed to delete module" }
  }
}

export async function unlockExam(moduleId: string, companyId: string) {
  try {
    const { error } = await supabase
      .from("modules")
      .update({ is_unlocked: true })
      .eq("id", moduleId)
      .eq("company_id", companyId)
      .eq("type", "exam")

    if (error) {
      console.error("Error unlocking exam:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${companyId}`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error unlocking exam:", error)
    return { success: false, error: "Failed to unlock exam" }
  }
}

export async function lockExam(moduleId: string, companyId: string) {
  try {
    const { error } = await supabase
      .from("modules")
      .update({ is_unlocked: false })
      .eq("id", moduleId)
      .eq("company_id", companyId)
      .eq("type", "exam")

    if (error) {
      console.error("Error locking exam:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${companyId}`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error locking exam:", error)
    return { success: false, error: "Failed to lock exam" }
  }
}