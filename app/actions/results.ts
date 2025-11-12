"use server"

import { supabase, supabaseAdmin } from "@/lib/supabase"
import { upsertUsersFromSupabase } from "@/app/actions/users"
import { revalidatePath } from "next/cache"

export type Result = {
	id: string
	user_id: string
	user_name: string | null
	module_id: string
	score: number
	total_questions: number
	correct_answers: number
	submitted_at: string
	created_at: string
}

export type ExamAnswer = {
	id: string
	result_id: string
	exercise_id: string
	selected_alternative_id: string
	is_correct: boolean
	time_spent_seconds: number
	created_at: string
}

export type AnswerSubmission = {
	exerciseId: string
	selectedAlternativeId: string
	isCorrect: boolean
	timeSpentSeconds?: number
}

export async function saveExamResult(
	userId: string,
	userName: string,
	moduleId: string,
	score: number,
	totalQuestions: number,
	correctAnswers: number,
	answers: AnswerSubmission[],
	companyId?: string
) {
	try {
		// Check if this is a guest user by looking up in guest_accounts table
		// IMPORTANT: Guests do NOT have auth accounts - they only exist in guest_accounts table
		const { data: guestAccount, error: guestError } = await supabaseAdmin
			.from("guest_accounts")
			.select("guest_id")
			.eq("guest_id", userId)
			.maybeSingle()

		const isGuest = !!guestAccount && !guestError

		// Best-effort: cache the submitting user in `users` table
		// SKIP for guest users - they do NOT have auth accounts and should NOT be in users table
		if (!isGuest) {
			try {
				await upsertUsersFromSupabase([userId])
			} catch { }
		}

		// Allow multiple attempts - no longer delete existing results

		// Create the new result record
		// Save only the UUID (userId is already just the UUID for guests)
		const { data: result, error: resultError } = await supabaseAdmin
			.from("results")
			.insert({
				user_id: userId,
				user_name: userName,
				module_id: moduleId,
				score,
				total_questions: totalQuestions,
				correct_answers: correctAnswers,
			})
			.select()
			.single()

		if (resultError) {
			console.error("Error creating result:", resultError)
			return { success: false, error: resultError.message }
		}

		// Then, create all the exam_answers records
		const examAnswersData = answers.map((answer) => ({
			result_id: result.id,
			exercise_id: answer.exerciseId,
			selected_alternative_id: answer.selectedAlternativeId,
			is_correct: answer.isCorrect,
			time_spent_seconds: answer.timeSpentSeconds || 0,
		}))

		const { error: answersError } = await supabaseAdmin
			.from("exam_answers")
			.insert(examAnswersData)

		if (answersError) {
			console.error("Error creating exam answers:", answersError)
			// If answers fail, delete the result to maintain data integrity
			await supabaseAdmin.from("results").delete().eq("id", result.id)
			return { success: false, error: answersError.message }
		}

		// Revalidate the dashboard page to show new results
		if (companyId) {
			revalidatePath(`/dashboard/${companyId}`, "page")
			console.log(`[saveExamResult] Revalidated path: /dashboard/${companyId}`)
		}

		return { success: true, data: result }
	} catch (error) {
		console.error("Error saving exam result:", error)
		return { success: false, error: "Failed to save exam result" }
	}
}

export async function getResultsByUser(userId: string): Promise<Result[]> {
	try {
		const { data, error } = await supabase
			.from("results")
			.select("*")
			.eq("user_id", userId)
			.order("submitted_at", { ascending: false })

		if (error) {
			console.error("Error fetching results:", error)
			return []
		}

		return data || []
	} catch (error) {
		console.error("Error fetching results:", error)
		return []
	}
}

export async function getResultsByUserAndModule(
	userId: string,
	moduleId: string
): Promise<Result | null> {
	try {
		// Use maybeSingle() instead of single() to avoid errors when no results exist
		const { data, error } = await supabase
			.from("results")
			.select("*")
			.eq("user_id", userId)
			.eq("module_id", moduleId)
			.order("submitted_at", { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			console.error("Error fetching result:", error)
			return null
		}

		return data
	} catch (error) {
		console.error("Error fetching result:", error)
		return null
	}
}

export async function getResultsByModule(moduleId: string): Promise<Result[]> {
	try {
		const { data, error } = await supabase
			.from("results")
			.select("*")
			.eq("module_id", moduleId)
			.order("submitted_at", { ascending: false })

		if (error) {
			console.error("Error fetching results:", error)
			return []
		}

		return data || []
	} catch (error) {
		console.error("Error fetching results:", error)
		return []
	}
}

export type ResultWithModule = Result & {
	module_title: string
	is_guest?: boolean
}

export async function getRecentResults(
	companyId: string,
	limit: number = 10
): Promise<ResultWithModule[]> {
	try {
		console.log('\n=== getRecentResults START ===')
		console.log('[getRecentResults] Timestamp:', new Date().toISOString())
		console.log('[getRecentResults] Company ID:', companyId)
		console.log('[getRecentResults] Limit:', limit)

		// Fetch modules for this company first (use admin client to bypass RLS)
		const { data: companyModules, error: modulesError } = await supabaseAdmin
			.from("modules")
			.select("id, title, company_id")
			.eq("company_id", companyId)

		if (modulesError) {
			console.error("[getRecentResults] ❌ Error fetching modules:", modulesError)
			console.error("[getRecentResults] Error details:", JSON.stringify(modulesError, null, 2))
			return []
		}

		console.log('[getRecentResults] ✅ Module query executed')
		console.log('[getRecentResults] Found modules count:', companyModules?.length || 0)

		if (companyModules && companyModules.length > 0) {
			console.log('[getRecentResults] Module details:')
			companyModules.forEach((m, i) => {
				console.log(`  ${i + 1}. "${m.title}" (ID: ${m.id}, company_id: ${m.company_id})`)
			})
		} else {
			console.log('[getRecentResults] ⚠️  No modules found for company:', companyId)
			console.log('[getRecentResults] This means:')
			console.log('  - Either no modules exist in the database')
			console.log('  - Or modules exist but their company_id does not match:', companyId)
			console.log('  - Run this SQL to check: SELECT id, title, company_id FROM modules;')
			return []
		}

		// Get module IDs
		const moduleIds = companyModules.map(m => m.id)
		console.log('[getRecentResults] Module IDs array:', moduleIds)

		// Fetch results that match these modules (use admin client to bypass RLS)
		console.log('[getRecentResults] Fetching results for', moduleIds.length, 'modules...')
		const { data: results, error: resultsError } = await supabaseAdmin
			.from("results")
			.select("*")
			.in("module_id", moduleIds)
			.order("submitted_at", { ascending: false })
			.limit(limit)

		if (resultsError) {
			console.error("[getRecentResults] ❌ Error fetching results:", resultsError)
			console.error("[getRecentResults] Error details:", JSON.stringify(resultsError, null, 2))
			return []
		}

		console.log('[getRecentResults] ✅ Results query executed')
		console.log('[getRecentResults] Found results count:', results?.length || 0)

		if (!results || results.length === 0) {
			console.log('[getRecentResults] ⚠️  No results found for these modules')
			console.log('[getRecentResults] This means:')
			console.log('  - No users have completed quizzes yet')
			console.log('  - Or results exist but module_id references are broken')
			console.log('  - Run this SQL to check: SELECT COUNT(*) FROM results WHERE module_id IN (\'' + moduleIds.join('\',\'') + '\');')
		} else {
			console.log('[getRecentResults] Result details:')
			results.forEach((r, i) => {
				console.log(`  ${i + 1}. User: ${r.user_name || r.user_id} | Score: ${r.score}% | Module: ${r.module_id}`)
			})
		}

		// Create a map for quick module lookup
		const moduleMap = new Map(companyModules.map(m => [m.id, m.title]))

		// Get all user_ids from results
		const userIds = results?.map((r: any) => r.user_id).filter(Boolean) || []

		// Check which user_ids are guests (not in users table)
		// First, try to get them from users table
		const { data: cachedUsers } = await supabaseAdmin
			.from("users")
			.select("auth_user_id")
			.in("auth_user_id", userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

		const cachedUserIds = new Set(cachedUsers?.map((u: any) => u.auth_user_id) || [])

		// Find user_ids that are NOT in users table (likely guests)
		const guestUserIds = userIds.filter((id: string) => !cachedUserIds.has(id))

		// Fetch guest account information for guest user_ids
		let guestAccountsMap = new Map<string, { name: string; email: string | null }>()
		if (guestUserIds.length > 0) {
			const { data: guestAccounts } = await supabaseAdmin
				.from("guest_accounts")
				.select("guest_id, name, email")
				.in("guest_id", guestUserIds)

			if (guestAccounts) {
				guestAccountsMap = new Map(
					guestAccounts.map((g: any) => [g.guest_id, { name: g.name, email: g.email }])
				)
			}
		}

		// Transform the data to include module title and ensure user_name is populated
		const formattedResults = results?.map((item: any) => {
			// Check if this is a guest user
			const isGuest = guestAccountsMap.has(item.user_id)

			// If user_name is missing or empty, try to get it from guest_accounts
			let userName = item.user_name
			if (!userName && isGuest) {
				const guestInfo = guestAccountsMap.get(item.user_id)!
				userName = guestInfo.name
			}

			return {
				id: item.id,
				user_id: item.user_id,
				user_name: userName || "Unknown User",
				module_id: item.module_id,
				score: item.score,
				total_questions: item.total_questions,
				correct_answers: item.correct_answers,
				submitted_at: item.submitted_at,
				created_at: item.created_at,
				module_title: moduleMap.get(item.module_id) || "Unknown Module",
				is_guest: isGuest,
			}
		}) || []

		console.log('[getRecentResults] ✅ Formatted results count:', formattedResults.length)
		console.log('[getRecentResults] Guest accounts found:', guestAccountsMap.size)
		console.log('=== getRecentResults END ===\n')
		return formattedResults
	} catch (error) {
		console.error("❌ [getRecentResults] Unexpected error:", error)
		console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
		return []
	}
}

export async function getExamAnswers(resultId: string): Promise<ExamAnswer[]> {
	try {
		// Use admin client to bypass RLS - needed for guest users who don't have auth accounts
		const { data, error } = await supabaseAdmin
			.from("exam_answers")
			.select("*")
			.eq("result_id", resultId)
			.order("created_at", { ascending: true })

		if (error) {
			console.error("Error fetching exam answers:", error)
			return []
		}

		return data || []
	} catch (error) {
		console.error("Error fetching exam answers:", error)
		return []
	}
}

export async function getResultWithAnswers(resultId: string) {
	try {
		// Use admin client to bypass RLS - needed for guest users who don't have auth accounts
		// First get the result
		const { data: result, error: resultError } = await supabaseAdmin
			.from("results")
			.select("*")
			.eq("id", resultId)
			.maybeSingle()

		if (resultError) {
			console.error("Error fetching result:", resultError)
			return { success: false, error: resultError.message }
		}

		if (!result) {
			return { success: false, error: "Result not found" }
		}

		// Check if this is a guest user by looking up in guest_accounts table
		const { data: guestAccount } = await supabaseAdmin
			.from("guest_accounts")
			.select("guest_id")
			.eq("guest_id", result.user_id)
			.maybeSingle()

		const isGuest = !!guestAccount

		// Then get exam_answers
		const { data: examAnswers, error: answersError } = await supabaseAdmin
			.from("exam_answers")
			.select("*")
			.eq("result_id", resultId)
			.order("created_at", { ascending: true })

		if (answersError) {
			console.error("Error fetching exam answers:", answersError)
			return { success: false, error: answersError.message }
		}

		// Now fetch exercises and alternatives separately for each answer
		// Use admin client to bypass RLS for guest access
		const answersWithDetails = await Promise.all(
			examAnswers.map(async (answer: any) => {
				const [exercise, alternative] = await Promise.all([
					supabaseAdmin
						.from("exercises")
						.select("id, question, image_url, weight")
						.eq("id", answer.exercise_id)
						.maybeSingle(),
					supabaseAdmin
						.from("alternatives")
						.select("id, content, is_correct, explanation")
						.eq("id", answer.selected_alternative_id)
						.maybeSingle(),
				])

				return {
					...answer,
					exercises: exercise.data || null,
					alternatives: alternative.data || null,
				}
			})
		)

		return {
			success: true,
			data: {
				result: {
					...result,
					is_guest: isGuest,
				},
				answers: answersWithDetails,
			},
		}
	} catch (error) {
		console.error("Error fetching result with answers:", error)
		return { success: false, error: "Failed to fetch result details" }
	}
}

// New functions for retake functionality
export async function getUserRetakeStats(userId: string, moduleId: string) {
	try {
		const { data, error } = await supabase
			.from("results")
			.select("*")
			.eq("user_id", userId)
			.eq("module_id", moduleId)
			.order("submitted_at", { ascending: false })

		if (error) {
			console.error("Error fetching retake stats:", error)
			return { success: false, error: error.message }
		}

		const attempts = data || []
		const totalAttempts = attempts.length
		const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a: any) => a.score)) : 0
		const latestScore = attempts.length > 0 ? attempts[0].score : 0
		const averageScore = attempts.length > 0 ? attempts.reduce((sum: number, a: any) => sum + a.score, 0) / attempts.length : 0

		return {
			success: true,
			data: {
				totalAttempts,
				bestScore,
				latestScore,
				averageScore: Math.round(averageScore * 100) / 100,
				attempts: attempts.map((a: any) => ({
					id: a.id,
					score: a.score,
					submitted_at: a.submitted_at,
					correct_answers: a.correct_answers,
					total_questions: a.total_questions
				}))
			}
		}
	} catch (error) {
		console.error("Error fetching retake stats:", error)
		return { success: false, error: "Failed to fetch retake statistics" }
	}
}

export async function getModuleRetakeStats(moduleId: string) {
	try {
		const { data, error } = await supabase
			.from("results")
			.select(`
        *,
        modules!inner (
          title,
          company_id
        )
      `)
			.eq("module_id", moduleId)
			.order("submitted_at", { ascending: false })

		if (error) {
			console.error("Error fetching module retake stats:", error)
			return { success: false, error: error.message }
		}

		const results = data || []

		// Group by user to get per-user statistics
		const userStats = results.reduce((acc: any, result: any) => {
			const userId = result.user_id
			if (!acc[userId]) {
				acc[userId] = {
					user_id: userId,
					user_name: result.user_name,
					attempts: [],
					totalAttempts: 0,
					bestScore: 0,
					latestScore: 0,
					averageScore: 0
				}
			}

			acc[userId].attempts.push({
				id: result.id,
				score: result.score,
				submitted_at: result.submitted_at,
				correct_answers: result.correct_answers,
				total_questions: result.total_questions
			})

			return acc
		}, {})

		// Calculate statistics for each user
		Object.values(userStats).forEach((user: any) => {
			user.totalAttempts = user.attempts.length
			user.bestScore = Math.max(...user.attempts.map((a: any) => a.score))
			user.latestScore = user.attempts[0].score
			user.averageScore = Math.round((user.attempts.reduce((sum: number, a: any) => sum + a.score, 0) / user.attempts.length) * 100) / 100
		})

		return {
			success: true,
			data: {
				moduleTitle: results[0]?.modules?.title || "Unknown Module",
				totalSubmissions: results.length,
				uniqueUsers: Object.keys(userStats).length,
				userStats: Object.values(userStats)
			}
		}
	} catch (error) {
		console.error("Error fetching module retake stats:", error)
		return { success: false, error: "Failed to fetch module retake statistics" }
	}
}

