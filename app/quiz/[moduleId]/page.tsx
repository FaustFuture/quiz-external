import { getModuleById } from "@/app/actions/modules"
import { getCompany } from "@/app/actions/company"
import { DashboardNavbar } from "@/components/dashboard-navbar"
import { notFound } from "next/navigation"
import { GuestQuizForm } from "@/components/guest-quiz-form"
import { supabaseAdmin } from "@/lib/supabase"
import { type Exercise } from "@/app/actions/exercises"
import { type Alternative } from "@/app/actions/alternatives"

interface GuestQuizPageProps {
	params: Promise<{ moduleId: string }>
}

// Helper function to get exercises using admin client (for guest access)
async function getExercisesForGuest(moduleId: string): Promise<Exercise[]> {
	try {
		const { data, error } = await supabaseAdmin
			.from("exercises")
			.select("*")
			.eq("module_id", moduleId)
			.order("order", { ascending: true })

		if (error) {
			console.error("Error fetching exercises:", error)
			return []
		}

		return (data || []) as Exercise[]
	} catch (error) {
		console.error("Error fetching exercises:", error)
		return []
	}
}

// Helper function to get alternatives using admin client (for guest access)
async function getAlternativesForGuest(exerciseId: string): Promise<Alternative[]> {
	try {
		const { data, error } = await supabaseAdmin
			.from("alternatives")
			.select("*")
			.eq("exercise_id", exerciseId)
			.order("order", { ascending: true })

		if (error) {
			console.error("Error fetching alternatives:", error)
			return []
		}

		return (data || []) as Alternative[]
	} catch (error) {
		console.error("Error fetching alternatives:", error)
		return []
	}
}

export default async function GuestQuizPage({ params }: GuestQuizPageProps) {
	const { moduleId } = await params

	// Fetch module data
	const module = await getModuleById(moduleId)

	if (!module) {
		notFound()
	}

	// Fetch company data for branding
	const companyRecord = await getCompany(module.company_id)
	const companyName = companyRecord?.name || module.company_id

	// Fetch exercises and alternatives using admin client (bypasses RLS)
	const exercises = await getExercisesForGuest(moduleId)

	// Fetch alternatives for each exercise
	const questionsWithAlternatives = await Promise.all(
		exercises.map(async (exercise) => {
			const alternatives = await getAlternativesForGuest(exercise.id)
			return {
				...exercise,
				alternatives
			}
		})
	)

	return (
		<div className="min-h-screen bg-background">
			<DashboardNavbar companyName={companyName} logoUrl={companyRecord?.logo_url || null} />
			<main className="container mx-auto p-6">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold tracking-tight mb-2">{module.title}</h1>
					{module.description && (
						<p className="text-lg text-muted-foreground">
							{module.description}
						</p>
					)}
				</div>

				<GuestQuizForm
					questions={questionsWithAlternatives}
					moduleTitle={module.title}
					moduleId={moduleId}
					companyId={module.company_id}
					moduleType={module.type}
					isUnlocked={module.is_unlocked}
				/>
			</main>
		</div>
	)
}

