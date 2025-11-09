"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * PERFORMANCE OPTIMIZATION: Get modules with their exercises and alternatives in a single optimized query
 * This replaces the N+1 query problem where we were fetching exercises and alternatives separately for each module
 */
export async function getModulesWithEligibilityCheck(companyId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Fetch all modules with their exercises and alternatives in a single query using joins
    // This is MUCH more efficient than the previous approach of separate queries per module
    const { data, error } = await supabase
      .from("modules")
      .select(`
        *,
        exercises!inner (
          id,
          question,
          alternatives!inner (
            id
          )
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching modules with eligibility:", error)
      return []
    }

    if (!data) return []

    // Process the data to filter eligible modules
    // A module is eligible if it has at least one exercise with:
    // 1. A non-empty question
    // 2. At least one alternative
    const eligibleModules = data.filter((module: any) => {
      const exercises = module.exercises || []
      return exercises.some((exercise: any) => {
        return (
          exercise.question &&
          exercise.question.trim().length > 0 &&
          exercise.alternatives &&
          exercise.alternatives.length > 0
        )
      })
    })

    // Return clean module data without nested exercises/alternatives
    return eligibleModules.map((module: any) => ({
      id: module.id,
      company_id: module.company_id,
      title: module.title,
      description: module.description,
      order: module.order,
      created_at: module.created_at,
      type: module.type,
      is_unlocked: module.is_unlocked,
    }))
  } catch (error) {
    console.error("Error fetching modules with eligibility:", error)
    return []
  }
}

/**
 * PERFORMANCE OPTIMIZATION: Batch fetch user results for multiple modules in a single query
 * This replaces sequential fetching of results for each module
 */
export async function getUserResultsForModules(userId: string, moduleIds: string[]) {
  try {
    if (moduleIds.length === 0) return {}

    const supabase = await createServerSupabaseClient()
    
    // Fetch all results for all modules in a single query
    const { data, error } = await supabase
      .from("results")
      .select("module_id, score, total_questions, correct_answers, submitted_at, id")
      .eq("user_id", userId)
      .in("module_id", moduleIds)
      .order("submitted_at", { ascending: false })

    if (error) {
      console.error("Error fetching user results:", error)
      return {}
    }

    // Group results by module_id, keeping only the latest result for each module
    const resultsByModule: { [key: string]: any } = {}
    
    if (data) {
      data.forEach((result) => {
        // Only keep the first (latest) result for each module due to ordering
        if (!resultsByModule[result.module_id]) {
          resultsByModule[result.module_id] = result
        }
      })
    }

    return resultsByModule
  } catch (error) {
    console.error("Error fetching user results:", error)
    return {}
  }
}

