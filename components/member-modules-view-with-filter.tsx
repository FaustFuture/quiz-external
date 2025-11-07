"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, RotateCcw, Trophy } from "lucide-react"
import Link from "next/link"
import { type Module } from "@/app/actions/modules"

interface MemberModulesViewWithFilterProps {
  companyId: string
  userId: string
  modules: Module[]
  userResults: { [moduleId: string]: any }
}

export function MemberModulesViewWithFilter({ 
  companyId, 
  userId, 
  modules, 
  userResults 
}: MemberModulesViewWithFilterProps) {
  const [filter, setFilter] = useState<'all' | 'module' | 'exam'>('all')
  const [retakeAllowed, setRetakeAllowed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/retakes/grants?userId=${encodeURIComponent(userId)}`)
        const json = await res.json()
        if (mounted && json.success) {
          const map: Record<string, boolean> = {}
          for (const id of (json.data as string[])) map[id] = true
          setRetakeAllowed(map)
        }
      } catch {}
    }
    load()
    return () => { mounted = false }
  }, [userId])

  const filteredModules = modules.filter((m) => {
    if (filter === 'all') return true
    return m.type === filter
  })

  const getTitle = () => {
    if (filter === 'module') return 'Available Quizzes'
    if (filter === 'exam') return 'Available Exams'
    return 'All Quizzes and Exams'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">{getTitle()}</h2>
        <div className="w-40">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="module">Quiz</SelectItem>
              <SelectItem value="exam">Exam</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filteredModules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
          No {filter === 'all' ? 'quizzes' : filter === 'module' ? 'quizzes' : 'exams'} available yet. Please check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredModules.map((module) => (
            <ModuleExamCard 
              key={module.id} 
              module={module} 
              companyId={companyId} 
              userId={userId}
              hasResult={!!userResults[module.id]}
              result={userResults[module.id]}
              canRetakeExam={!!retakeAllowed[module.id]}
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
  hasResult: boolean
  result: any
  canRetakeExam: boolean
}

function ModuleExamCard({ module, companyId, userId, hasResult, result, canRetakeExam }: ModuleExamCardProps) {
  return (
    <Card className="relative group hover:shadow-xl border-border bg-card hover:bg-muted hover:border-emerald-500/50 flex flex-col min-h-64">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                module.type === 'exam'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              }`}>
                {module.type === 'exam' ? 'Exam' : 'Quiz'}
              </span>
              {module.type === 'exam' && (
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  module.is_unlocked
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {module.is_unlocked ? 'Unlocked' : 'Locked'}
                </span>
              )}
            </div>
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
            
            {/* Actions: View and optional Retake */}
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
                Take {module.type === 'exam' ? 'Exam' : 'Quiz'}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
