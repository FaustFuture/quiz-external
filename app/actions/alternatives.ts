"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export type Alternative = {
  id: string
  exercise_id: string | null
  content: string
  is_correct: boolean
  explanation: string | null
  image_url?: string | null
  image_urls?: string[] | null
  order: number
  created_at: string
}

export async function createAlternative(
  exerciseId: string,
  content: string,
  isCorrect: boolean = false,
  explanation: string = "",
  imageUrl?: string | null,
  imageUrls?: string[] | null
) {
  try {
    // Get existing alternatives for this exercise
    const { data: existingAlternatives } = await supabase
      .from("alternatives")
      .select("order, is_correct, id")
      .eq("exercise_id", exerciseId)
      .order("order", { ascending: false })

    const nextOrder = existingAlternatives && existingAlternatives.length > 0 
      ? existingAlternatives[0].order + 1 
      : 0

    // If this is the first alternative, make it correct by default
    const hasExistingAlternatives = existingAlternatives && existingAlternatives.length > 0
    const hasCorrectAlternative = existingAlternatives?.some(alt => alt.is_correct) || false
    
    // Make it correct if it's the first alternative OR if no correct alternative exists
    const shouldBeCorrect = !hasExistingAlternatives || !hasCorrectAlternative || isCorrect

    // If this new alternative is correct and there are existing correct alternatives,
    // we need to handle this carefully to avoid the database constraint
    if (shouldBeCorrect && hasCorrectAlternative) {
      // First, create the new alternative as correct
      const { data: newAlternative, error: insertError } = await supabase
        .from("alternatives")
        .insert({
          exercise_id: exerciseId,
          content,
          is_correct: true, // Set as correct immediately
          explanation: explanation || null,
          order: nextOrder,
          // If the column doesn't exist yet, Supabase will ignore unknown keys in some clients;
          // if it errors, the caller will see the message.
          image_url: imageUrl || null,
          image_urls: (imageUrls && imageUrls.length > 0) ? imageUrls.slice(0, 4) : null,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error creating new alternative:", insertError)
        return { success: false, error: insertError.message }
      }

      // Now that we have a correct alternative, remove correct status from others
      const correctAlternativeIds = existingAlternatives
        ?.filter(alt => alt.is_correct)
        .map(alt => alt.id) || []

      if (correctAlternativeIds.length > 0) {
        const { error: updateError } = await supabase
          .from("alternatives")
          .update({ is_correct: false })
          .in("id", correctAlternativeIds)
          .eq("exercise_id", exerciseId)

        if (updateError) {
          console.error("Error updating existing alternatives:", updateError)
          // If this fails, we should clean up the new alternative
          await supabase
            .from("alternatives")
            .delete()
            .eq("id", newAlternative.id)
          return { success: false, error: updateError.message }
        }
      }

      revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
      return { success: true, data: newAlternative }
    } else {
      // Normal case: create alternative without changing others
      const { data, error } = await supabase
        .from("alternatives")
        .insert({
          exercise_id: exerciseId,
          content,
          is_correct: shouldBeCorrect,
          explanation: explanation || null,
          order: nextOrder,
          image_url: imageUrl || null,
          image_urls: (imageUrls && imageUrls.length > 0) ? imageUrls.slice(0, 4) : null,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating alternative:", error)
        return { success: false, error: error.message }
      }

      revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
      return { success: true, data }
    }
  } catch (error) {
    console.error("Error creating alternative:", error)
    return { success: false, error: "Failed to create alternative" }
  }
}

export async function getAlternatives(exerciseId: string): Promise<Alternative[]> {
  try {
    const { data, error } = await supabase
      .from("alternatives")
      .select("*")
      .eq("exercise_id", exerciseId)
      .order("order", { ascending: true })

    if (error) {
      console.error("Error fetching alternatives:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching alternatives:", error)
    return []
  }
}

export async function updateAlternative(
  alternativeId: string,
  exerciseId: string,
  updates: { content?: string; is_correct?: boolean; explanation?: string; image_url?: string | null; image_urls?: string[] | null }
) {
  try {
    // If we're making this alternative correct, we need to handle this carefully
    if (updates.is_correct === true) {
      // First, update this alternative to be correct
      const { data: updatedAlternative, error: updateError } = await supabase
        .from("alternatives")
        .update({ ...updates, is_correct: true })
        .eq("id", alternativeId)
        .eq("exercise_id", exerciseId)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating alternative:", updateError)
        return { success: false, error: updateError.message }
      }

      // Now remove correct status from all other alternatives
      const { data: otherAlternatives } = await supabase
        .from("alternatives")
        .select("id")
        .eq("exercise_id", exerciseId)
        .neq("id", alternativeId)
        .eq("is_correct", true)

      if (otherAlternatives && otherAlternatives.length > 0) {
        const otherIds = otherAlternatives.map(alt => alt.id)
        const { error: removeError } = await supabase
          .from("alternatives")
          .update({ is_correct: false })
          .in("id", otherIds)
          .eq("exercise_id", exerciseId)

        if (removeError) {
          console.error("Error removing correct status from others:", removeError)
          // Rollback: make this alternative incorrect again
          await supabase
            .from("alternatives")
            .update({ is_correct: false })
            .eq("id", alternativeId)
            .eq("exercise_id", exerciseId)
          return { success: false, error: removeError.message }
        }
      }

      revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
      return { success: true, data: updatedAlternative }
    } else {
      // Normal update without changing correct status
      const { data, error } = await supabase
        .from("alternatives")
        .update(updates)
        .eq("id", alternativeId)
        .eq("exercise_id", exerciseId)
        .select()
        .single()

      if (error) {
        console.error("Error updating alternative:", error)
        return { success: false, error: error.message }
      }

      revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
      return { success: true, data }
    }
  } catch (error) {
    console.error("Error updating alternative:", error)
    return { success: false, error: "Failed to update alternative" }
  }
}

export async function updateAlternativeOrder(alternativeId: string, newOrder: number, exerciseId: string) {
  try {
    // First, temporarily set all orders to negative values to avoid conflicts
    const { error: tempError } = await supabase
      .from("alternatives")
      .update({ order: -1 })
      .eq("exercise_id", exerciseId)

    if (tempError) {
      console.error("Error setting temporary orders:", tempError)
      return { success: false, error: tempError.message }
    }

    // Get all alternatives for this exercise
    const { data: allAlternatives, error: fetchError } = await supabase
      .from("alternatives")
      .select("id, order")
      .eq("exercise_id", exerciseId)
      .order("order", { ascending: true })

    if (fetchError) {
      console.error("Error fetching alternatives:", fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!allAlternatives) {
      return { success: false, error: "No alternatives found" }
    }

    // Find the alternative being moved
    const oldIndex = allAlternatives.findIndex(alt => alt.id === alternativeId)
    if (oldIndex === -1) {
      return { success: false, error: "Alternative not found" }
    }

    // Create new order array
    const newOrderArray = [...allAlternatives]
    const [movedAlternative] = newOrderArray.splice(oldIndex, 1)
    newOrderArray.splice(newOrder, 0, movedAlternative)

    // Update all alternatives with new order values
    for (let i = 0; i < newOrderArray.length; i++) {
      const { error } = await supabase
        .from("alternatives")
        .update({ order: i })
        .eq("id", newOrderArray[i].id)
        .eq("exercise_id", exerciseId)

      if (error) {
        console.error("Error updating alternative order:", error)
        return { success: false, error: error.message }
      }
    }

    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error updating alternative order:", error)
    return { success: false, error: "Failed to update alternative order" }
  }
}

export async function deleteAlternative(alternativeId: string, exerciseId: string) {
  try {
    // First, get all alternatives for this exercise
    const { data: allAlternatives, error: fetchError } = await supabase
      .from("alternatives")
      .select("id, is_correct")
      .eq("exercise_id", exerciseId)

    if (fetchError) {
      console.error("Error fetching alternatives:", fetchError)
      return { success: false, error: fetchError.message }
    }

    // Find the alternative to be deleted
    const alternativeToDelete = allAlternatives?.find(alt => alt.id === alternativeId)
    
    if (!alternativeToDelete) {
      return { success: false, error: "Alternative not found" }
    }

    // If the alternative to delete is correct, we need to transfer correctness to another option
    if (alternativeToDelete.is_correct) {
      // Get all other alternatives (excluding the one to be deleted)
      const otherAlternatives = allAlternatives?.filter(alt => alt.id !== alternativeId) || []
      
      if (otherAlternatives.length === 0) {
        return { success: false, error: "Cannot delete the last alternative" }
      }

      // Randomly select one of the other alternatives to make correct
      const randomIndex = Math.floor(Math.random() * otherAlternatives.length)
      const newCorrectAlternative = otherAlternatives[randomIndex]

      // Update the randomly selected alternative to be correct
      const { error: updateError } = await supabase
        .from("alternatives")
        .update({ is_correct: true })
        .eq("id", newCorrectAlternative.id)
        .eq("exercise_id", exerciseId)

      if (updateError) {
        console.error("Error updating new correct alternative:", updateError)
        return { success: false, error: updateError.message }
      }
    }

    // Now delete the original alternative
    const { error: deleteError } = await supabase
      .from("alternatives")
      .delete()
      .eq("id", alternativeId)
      .eq("exercise_id", exerciseId)

    if (deleteError) {
      console.error("Error deleting alternative:", deleteError)
      return { success: false, error: deleteError.message }
    }

    revalidatePath(`/dashboard/[companyId]/modules/[moduleId]`, "page")
    return { success: true }
  } catch (error) {
    console.error("Error deleting alternative:", error)
    return { success: false, error: "Failed to delete alternative" }
  }
}
