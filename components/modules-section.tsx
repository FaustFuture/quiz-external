"use client"

import { useState, useEffect } from "react"
import { AddModuleDialog } from "@/components/add-module-dialog"
import { SortableModulesList } from "@/components/sortable-modules-list"
import { getModules, type Module } from "@/app/actions/modules"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ModulesSectionProps {
  companyId: string
  initialModules: Module[]
}

export function ModulesSection({ companyId, initialModules }: ModulesSectionProps) {
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'module' | 'exam'>('all')

  const refetchModules = async () => {
    setIsLoading(true)
    try {
      const updatedModules = await getModules(companyId)
      setModules(updatedModules)
    } catch (error) {
      console.error("Error refetching modules:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredModules = modules.filter((m) => {
    if (filter === 'all') return true
    return m.type === filter
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {filter === 'all' ? 'All Quizzes and Exams' : filter === 'exam' ? 'Exams' : 'Quizzes'}
        </h2>
        <div className="flex items-center gap-3">
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
          <AddModuleDialog companyId={companyId} onModuleCreated={refetchModules} />
        </div>
      </div>
      
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-gray-400">Loading quizzes...</p>
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-gray-400">
            No quizzes yet. Click "Add Module" to create your first quiz.
          </p>
        </div>
      ) : (
        <SortableModulesList
          key={filter}
          modules={filteredModules}
          companyId={companyId}
          onModuleDeleted={refetchModules}
        />
      )}
    </div>
  )
}
