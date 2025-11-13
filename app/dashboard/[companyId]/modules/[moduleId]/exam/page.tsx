import { requireAuth } from "@/lib/supabase-server"
import { DashboardNavbar } from "@/components/dashboard-navbar"
import { getModules } from "@/app/actions/modules"
import { getExercises } from "@/app/actions/exercises"
import { getAlternatives } from "@/app/actions/alternatives"
import { ExamInterface } from "@/components/exam-interface"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getCompany } from "@/app/actions/company"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ExamPageProps {
	params: Promise<{ companyId: string; moduleId: string }>
}

export default async function ExamPage({ params }: ExamPageProps) {
	const { companyId, moduleId } = await params

	// Ensure the user is logged in with Supabase
	const user = await requireAuth()
	const userId = user.id

	// Fetch the company data
	const companyRecord = await getCompany(companyId)

	// Get company name from database
	const companyName = companyRecord?.name || companyId

	// Get user name from Supabase auth
	const userName = user.email?.split('@')[0] || user.id.slice(0, 8)

	// Get modules to find the current module
	const modules = await getModules(companyId)
	const module = modules.find((m) => m.id === moduleId)

	if (!module) {
		notFound()
	}

	// Check if exam is locked - redirect to dashboard if locked
	if (module.type === 'exam' && !module.is_unlocked) {
		return (
			<div className="min-h-screen bg-background">
				<DashboardNavbar companyName={companyName} logoUrl={companyRecord?.logo_url || null} />
				<main className="container mx-auto p-6">
					<div className="mb-6">
						<Link href={`/dashboard/${companyId}`}>
							<Button variant="ghost" className="mb-4 gap-2">
								<ArrowLeft className="h-4 w-4" />
								Back to Dashboard
							</Button>
						</Link>
					</div>
					<div className="flex items-center justify-center min-h-[60vh]">
						<div className="text-center space-y-4 max-w-md">
							<h1 className="text-3xl font-bold text-foreground">Exam Locked</h1>
							<p className="text-muted-foreground">
								This exam is currently locked. Please contact an administrator to unlock it before taking the exam.
							</p>
							<Link href={`/dashboard/${companyId}`}>
								<Button>Back to Dashboard</Button>
							</Link>
						</div>
					</div>
				</main>
			</div>
		)
	}

	// Fetch exercises for this module
	const exercises = await getExercises(moduleId)

	// Fetch alternatives for each exercise
	const questionsWithAlternatives = await Promise.all(
		exercises.map(async (exercise) => {
			const alternatives = await getAlternatives(exercise.id)
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
				{/* Header */}
				<div className="mb-6">
					<Link href={`/dashboard/${companyId}`}>
						<Button variant="ghost" className="mb-4 gap-2">
							<ArrowLeft className="h-4 w-4" />
							Back to Dashboard
						</Button>
					</Link>

					<div className="text-center mb-8">
						<h1 className="text-4xl font-bold tracking-tight mb-2">{module.title}</h1>
						{module.description && (
							<p className="text-lg text-muted-foreground">
								{module.description}
							</p>
						)}
					</div>
				</div>

				{/* Exam Interface */}
				<ExamInterface
					questions={questionsWithAlternatives}
					moduleTitle={module.title}
					companyId={companyId}
					moduleId={moduleId}
					userId={userId}
					userName={userName}
					moduleType={module.type}
					isUnlocked={module.is_unlocked}
				/>
			</main>
		</div>
	)
}
