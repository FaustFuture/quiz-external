import { getModules, type Module } from "@/app/actions/modules"
import { getResultsByUserAndModule, getResultsByUser } from "@/app/actions/results"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Play, RotateCcw, Trophy } from "lucide-react"
import Link from "next/link"
import { getUserRetakeGrants } from "@/app/actions/users"

interface MemberModulesViewProps {
  companyId: string
  userId: string
}

export async function MemberModulesView({ companyId, userId }: MemberModulesViewProps) {
  const modules = await getModules(companyId)
  const grants = await getUserRetakeGrants(userId)
  const retakeAllowed = new Set<string>((grants.success ? (grants.data as string[]) : []))
  
  // Debug: Get all results for this user
  const allUserResults = await getResultsByUser(userId)
  console.log('All user results:', allUserResults)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Available Modules</h2>
        <p className="text-muted-foreground">
          Select a module to take the exam
        </p>
      </div>
      
      {modules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No modules available yet. Please check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {modules.map((module) => (
            <ModuleExamCard 
              key={module.id} 
              module={module} 
              companyId={companyId} 
              userId={userId}
              canRetakeExam={retakeAllowed.has(module.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ModuleExamCardProps {
  module: Module
  companyId: string
  userId: string
  canRetakeExam: boolean
}

async function ModuleExamCard({ module, companyId, userId, canRetakeExam }: ModuleExamCardProps) {
  // Fetch the most recent result for this user and module
  const result = await getResultsByUserAndModule(userId, module.id)
  const hasResult = result !== null
  
  // Debug logging
  console.log(`Module: ${module.title}, User: ${userId}, Has Result: ${hasResult}`)
  if (result) {
    console.log('Result data:', result)
  }
  
  return (
    <Card className="relative group hover:shadow-xl border-border bg-card hover:bg-muted hover:border-emerald-500/50 flex flex-col min-h-64">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-2xl text-foreground">{module.title}</CardTitle>
            {module.description && (
              <CardDescription className="mt-3 line-clamp-3 text-muted-foreground text-base">
                {module.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {hasResult ? (
          <div className="space-y-6 flex flex-col flex-1">
            {/* Show previous result */}
            <div className="rounded-xl bg-muted border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Previous Score
                </span>
                <Trophy className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${
                  result.score >= 70 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {Math.round(result.score)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  ({result.correct_answers}/{result.total_questions} correct)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Taken {new Date(result.submitted_at).toLocaleDateString()}
              </p>
            </div>
            
            {/* Actions: View and Retake (quizzes enabled, exams disabled) */}
            <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href={`/dashboard/${companyId}/modules/${module.id}/exam?view=results`}>
                <Button className="w-full gap-2 bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-accent hover:border-emerald-500" variant="outline">
                  <Trophy className="h-4 w-4" />
                  View {module.type === 'exam' ? 'Exam' : 'Quiz'}
                </Button>
              </Link>
              {module.type === 'module' ? (
                <Link href={`/dashboard/${companyId}/modules/${module.id}/exam`}>
                  <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <RotateCcw className="h-4 w-4" />
                    Retake Quiz
                  </Button>
                </Link>
              ) : (
                canRetakeExam ? (
                  <Link href={`/dashboard/${companyId}/modules/${module.id}/exam`}>
                    <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <RotateCcw className="h-4 w-4" />
                      Retake Exam
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full gap-2" variant="secondary" disabled>
                    <RotateCcw className="h-4 w-4" />
                    Retake Exam
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            {/* No result yet - show take exam */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 mb-4">
              <span>Created {new Date(module.created_at).toLocaleDateString()}</span>
            </div>
            
            <Link href={`/dashboard/${companyId}/modules/${module.id}/exam`} className="mt-auto">
              <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Play className="h-4 w-4" />
                Take Quiz
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
