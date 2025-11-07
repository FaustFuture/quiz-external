"use client"

import { useState } from "react"
import { Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { unlockExam, lockExam } from "@/app/actions/modules"
import { useRouter } from "next/navigation"

interface ExamLockToggleProps {
  moduleId: string
  companyId: string
  isUnlocked: boolean
  moduleType: 'module' | 'exam'
}

export function ExamLockToggle({ moduleId, companyId, isUnlocked, moduleType }: ExamLockToggleProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Only show for exams
  if (moduleType !== 'exam') {
    return null
  }

  const handleToggle = async () => {
    setIsLoading(true)
    
    try {
      const result = isUnlocked 
        ? await lockExam(moduleId, companyId)
        : await unlockExam(moduleId, companyId)
      
      if (result.success) {
        router.refresh()
      } else {
        console.error(`Failed to ${isUnlocked ? 'lock' : 'unlock'} exam:`, result.error)
        alert(`Failed to ${isUnlocked ? 'lock' : 'unlock'} exam. Please try again.`)
      }
    } catch (error) {
      console.error(`Error ${isUnlocked ? 'locking' : 'unlocking'} exam:`, error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className="gap-2 min-w-[140px]"
    >
      {isUnlocked ? (
        <>
          <Lock className="h-4 w-4" />
          {isLoading ? "Locking..." : "Lock Exam"}
        </>
      ) : (
        <>
          <Unlock className="h-4 w-4" />
          {isLoading ? "Unlocking..." : "Unlock Exam"}
        </>
      )}
    </Button>
  )
}
