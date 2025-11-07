"use server"

import { supabase } from "@/lib/supabase"
import { whopsdk } from "@/lib/whop-sdk"

export type CachedUser = {
  id: string
  whop_user_id: string
  name: string | null
  username: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
}

export async function upsertUsersFromWhop(userIds: string[]) {
  if (!Array.isArray(userIds) || userIds.length === 0) return { success: true }
  const unique = Array.from(new Set(userIds))
  const users: any[] = []
  for (const id of unique) {
    try {
      const u = await whopsdk.users.retrieve(id)
      users.push({
        whop_user_id: id,
        name: (u as any).name || null,
        username: (u as any).username || null,
        email: (u as any).email || null,
        avatar_url: (u as any).avatar_url || null,
      })
    } catch (e) {
      // Fallback: ensure we at least cache the ID so relations work
      users.push({
        whop_user_id: id,
        name: null,
        username: null,
        email: null,
        avatar_url: null,
      })
    }
  }
  if (users.length === 0) return { success: false, error: "No valid users" }

  const { error } = await supabase
    .from("users")
    .upsert(users, { onConflict: "whop_user_id" })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function resolveUsernamesToIds(usernames: string[]) {
  if (!Array.isArray(usernames) || usernames.length === 0) return { success: false, error: "No usernames provided" }
  const unique = Array.from(new Set(usernames.map(u => (u || "").trim()).filter(Boolean)))
  const userIds: string[] = []
  const usersToUpsert: any[] = []

  // 1) Try local cache first
  let foundUsernames = new Set<string>()
  try {
    const { data: cached } = await supabase
      .from("users")
      .select("whop_user_id, username, name, email, avatar_url")
      .in("username", unique)
    const cachedMap = new Map((cached || []).map(u => [u.username, u]))
    for (const username of unique) {
      const hit = cachedMap.get(username)
      if (hit) {
        userIds.push(hit.whop_user_id)
        foundUsernames.add(username)
      }
    }
  } catch (e) {
    // ignore cache errors, we'll fallback to API below
  }

  // 2) For any usernames not found locally, try Whop API and cache
  const remaining = unique.filter(u => !foundUsernames.has(u))
  for (const username of remaining) {
    try {
      const usersApi: any = (whopsdk as any).users
      let resp: any = null
      if (usersApi && typeof usersApi.list === 'function') {
        resp = await usersApi.list({ username })
      } else if (usersApi && typeof usersApi.search === 'function') {
        resp = await usersApi.search({ username })
      }
      if (resp && resp.data && resp.data.length > 0) {
        const user = resp.data[0]
        userIds.push(user.id)
        usersToUpsert.push({
          whop_user_id: user.id,
          name: user.name || null,
          username: user.username || null,
          email: user.email || null,
          avatar_url: user.avatar_url || null,
        })
      }
    } catch (e) {
      console.error(`Failed to resolve username ${username}:`, e)
    }
  }

  if (userIds.length === 0) return { success: false, error: "No valid usernames found" }

  if (usersToUpsert.length > 0) {
    const { error } = await supabase
      .from("users")
      .upsert(usersToUpsert, { onConflict: "whop_user_id" })
    if (error) console.error("Failed to cache users:", error)
  }

  return { success: true, data: Array.from(new Set(userIds)) }
}

export async function getCachedUsersByIds(userIds: string[]) {
  if (userIds.length === 0) return []
  const { data } = await supabase
    .from("users")
    .select("*")
    .in("whop_user_id", userIds)
  return data || []
}

export async function grantExamRetake(moduleId: string, userIds: string[], grantedBy: string) {
  try {
    // Ensure users are cached
    await upsertUsersFromWhop(userIds)

    const rows = userIds.map((uid) => ({ 
      module_id: moduleId, 
      user_id: uid, 
      granted_by: grantedBy,
      used_at: null // Reset used_at to null when granting/re-granting
    }))
    // Use upsert with onConflict to handle duplicates - if grant already exists, update granted_at and reset used_at to null
    const { error } = await supabase
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

export async function grantExamRetakeByUsernames(moduleId: string, usernames: string[], grantedBy: string) {
  try {
    // Resolve usernames to user IDs
    const resolveResult = await resolveUsernamesToIds(usernames)
    if (!resolveResult.success) {
      return { success: false, error: resolveResult.error }
    }

    const userIds = resolveResult.data || []
    if (userIds.length === 0) {
      return { success: false, error: "No valid usernames found" }
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

    const { data, error } = await supabase
      .from("users")
      .select("whop_user_id, username, name, email")
      .or(`username.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%`)
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
    const { data: grants, error: gErr } = await supabase
      .from("exam_retakes")
      .select("id, user_id, granted_by, granted_at, used_at")
      .eq("module_id", moduleId)
      .order("granted_at", { ascending: false })
    if (gErr) return { success: false, error: gErr.message, data: [] }

    const userIds = Array.from(new Set((grants || []).map((g: any) => g.user_id)))
    let usersById: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("whop_user_id, username, name, email, avatar_url")
        .in("whop_user_id", userIds)
      for (const u of usersData || []) usersById[u.whop_user_id] = u
    }

    const rows = (grants || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      username: usersById[r.user_id]?.username || null,
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


