"use client"

import { useState, useEffect } from "react"
import { AddModuleDialog } from "@/components/add-module-dialog"
import { SortableModulesList } from "@/components/sortable-modules-list"
import { getModules, type Module } from "@/app/actions/modules"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientSupabaseClient } from "@/lib/supabase-client"

interface ModulesSectionProps {
  companyId: string
  initialModules: Module[]
}

export function ModulesSection({ companyId, initialModules }: ModulesSectionProps) {
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'module' | 'exam'>('all')

  // Real-time subscription for quiz grid updates
  useEffect(() => {
    const supabase = createClientSupabaseClient()

    console.log('[ModulesSection] Setting up real-time subscription for company:', companyId)

    // Subscribe to changes in the modules table
    const channelName = `modules-grid-${companyId}`
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'modules',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('[ModulesSection] Real-time change received:', payload)

          if (payload.eventType === 'INSERT') {
            const newModule = payload.new as Module
            setModules((prevModules) => {
              // Check if already exists to avoid duplicates
              const exists = prevModules.some(m => m.id === newModule.id)
              if (exists) {
                console.log('[ModulesSection] Quiz already exists, skipping:', newModule.title)
                return prevModules
              }
              
              // Add to beginning (newest first)
              const newModules = [newModule, ...prevModules]
              console.log('[ModulesSection] ✅ Quiz added:', newModule.title, '| New count:', newModules.length)
              return newModules
            })
            console.log('[ModulesSection] State update triggered for:', newModule.title)
          } else if (payload.eventType === 'UPDATE') {
            const updatedModule = payload.new as Module
            setModules((prevModules) =>
              prevModules.map((m) =>
                m.id === updatedModule.id ? updatedModule : m
              )
            )
            console.log('[ModulesSection] ✅ Quiz updated:', updatedModule.title)
          } else if (payload.eventType === 'DELETE') {
            const deletedModule = payload.old as Module
            setModules((prevModules) =>
              prevModules.filter((m) => m.id !== deletedModule.id)
            )
            console.log('[ModulesSection] ✅ Quiz deleted:', deletedModule.id)
          }
        }
      )
      .subscribe((status) => {
        console.log('[ModulesSection] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[ModulesSection] ✅ Successfully subscribed to quiz updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ModulesSection] ❌ Failed to subscribe to quiz updates')
        }
      })

    // Cleanup
    return () => {
      console.log('[ModulesSection] Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [companyId])

  // Sync with initial modules when prop changes
  useEffect(() => {
    setModules(initialModules)
  }, [initialModules])

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

  console.log('[ModulesSection] Rendering. Total modules:', modules.length, '| Filtered:', filteredModules.length, '| Filter:', filter)

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
          modules={filteredModules}
          companyId={companyId}
          onModuleDeleted={refetchModules}
        />
      )}
    </div>
  )
}
