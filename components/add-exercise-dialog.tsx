"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createExercise } from "@/app/actions/exercises"
import { usePathname, useRouter } from "next/navigation"

interface AddExerciseDialogProps {
  moduleId: string
}

export function AddExerciseDialog({ moduleId }: AddExerciseDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [canCreate, setCanCreate] = useState(true)

  // Listen for validity updates from the exercise navigator
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { canAdd?: boolean }
      if (typeof detail?.canAdd === "boolean") {
        setCanCreate(detail.canAdd)
      }
    }
    window.addEventListener("quizwhop:exercise-can-add", handler as EventListener)
    return () => window.removeEventListener("quizwhop:exercise-can-add", handler as EventListener)
  }, [])

  const handleCreateExercise = async () => {
    if (!canCreate) return
    setIsLoading(true)
    
    try {
      const result = await createExercise(moduleId, "", "", 1)
      
      if (result.success) {
        const newExerciseId = result.data.id as string
        // Navigate to this page with a query param so the UI opens the new exercise
        router.push(`${pathname}?exerciseId=${newExerciseId}`)
        router.refresh()
      } else {
        console.error("Failed to create exercise:", result.error)
        alert("Failed to create exercise. Please try again.")
      }
    } catch (error) {
      console.error("Error creating exercise:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleCreateExercise}
      disabled={isLoading || !canCreate}
      size="sm"
      className="gap-2 bg-emerald-600 hover:bg-emerald-700 min-w-[140px]"
      title={!canCreate ? "Complete the current exercise (title and at least one option) before adding another." : undefined}
    >
      <Plus className="h-4 w-4" />
      {isLoading ? "Creating..." : "Add Exercise"}
    </Button>
  )
}
