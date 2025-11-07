"use client"

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
import { type Module } from "@/app/actions/modules"

interface MemberModulesViewClientProps {
  companyId: string
  userId: string
  modules: Module[]
  userResults: { [moduleId: string]: any }
}

export function MemberModulesViewClient({ 
  companyId, 
  userId, 
  modules, 
  userResults 
}: MemberModulesViewClientProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Available Modules</h2>
        <p className="text-gray-400">
          Select a module to take the exam
        </p>
      </div>
      
      {modules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-gray-400">
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
              hasResult={!!userResults[module.id]}
              result={userResults[module.id]}
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
}

function ModuleExamCard({ module, companyId, userId, hasResult, result }: ModuleExamCardProps) {
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
                  Previous Result
                </span>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  <span className="text-lg font-bold text-foreground">
                    {result.score}%
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Completed {new Date(result.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Link 
                href={`/dashboard/${companyId}/modules/${module.id}/exam`}
                className="flex-1"
              >
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Play className="w-4 h-4 mr-2" />
                  Retake Exam
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-end">
            <Link 
              href={`/dashboard/${companyId}/modules/${module.id}/exam`}
              className="w-full"
            >
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Play className="w-4 h-4 mr-2" />
                Take Quiz
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
