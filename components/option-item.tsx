"use client"

import { useState } from "react"
import { Edit, Trash2, MoreVertical, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { type Alternative } from "@/app/actions/alternatives"
import { updateAlternative, deleteAlternative } from "@/app/actions/alternatives"
import { useRouter } from "next/navigation"

interface OptionItemProps {
  option: Alternative
  exerciseId: string
}

export function OptionItem({ option, exerciseId }: OptionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editedContent, setEditedContent] = useState(option.content)
  const [editedExplanation, setEditedExplanation] = useState(option.explanation || "")
  const [editedIsCorrect, setEditedIsCorrect] = useState(option.is_correct)
  const router = useRouter()

  const handleSave = async () => {
    try {
      const result = await updateAlternative(option.id, exerciseId, {
        content: editedContent,
        is_correct: editedIsCorrect,
        explanation: editedExplanation || null,
      })
      
      if (result.success) {
        setIsEditing(false)
        router.refresh()
      } else {
        console.error("Failed to update option:", result.error)
        alert("Failed to update option. Please try again.")
      }
    } catch (error) {
      console.error("Error updating option:", error)
      alert("An error occurred while updating. Please try again.")
    }
  }

  const handleCancel = () => {
    setEditedContent(option.content)
    setEditedExplanation(option.explanation || "")
    setEditedIsCorrect(option.is_correct)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this option?")) {
      return
    }

    setIsDeleting(true)
    
    try {
      const result = await deleteAlternative(option.id, exerciseId)
      
      if (result.success) {
        router.refresh()
      } else {
        console.error("Failed to delete option:", result.error)
        alert("Failed to delete option. Please try again.")
      }
    } catch (error) {
      console.error("Error deleting option:", error)
      alert("An error occurred while deleting. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <Card className="border-primary/50">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Input
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Option content"
              autoFocus
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={editedIsCorrect}
              onCheckedChange={(checked) => setEditedIsCorrect(checked as boolean)}
            />
            <label className="text-sm font-medium">
              Correct answer
            </label>
          </div>
          
          <div className="space-y-2">
            <Textarea
              value={editedExplanation}
              onChange={(e) => setEditedExplanation(e.target.value)}
              placeholder="Explanation (optional)"
              rows={2}
            />
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleCorrectnessToggle = async () => {
    try {
      const result = await updateAlternative(option.id, exerciseId, {
        is_correct: !option.is_correct
      })
      
      if (result.success) {
        router.refresh()
      } else {
        console.error("Failed to update option correctness:", result.error)
        alert("Failed to update option. Please try again.")
      }
    } catch (error) {
      console.error("Error updating option correctness:", error)
      alert("An error occurred while updating. Please try again.")
    }
  }

  return (
    <Card className={`${option.is_correct ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={option.is_correct}
                onCheckedChange={handleCorrectnessToggle}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <span className="font-medium">{option.content}</span>
            </div>
            {option.explanation && (
              <p className="text-sm text-muted-foreground ml-6">
                {option.explanation}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isDeleting}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
