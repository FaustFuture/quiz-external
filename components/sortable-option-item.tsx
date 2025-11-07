"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Edit, Trash2, MoreVertical, Check, X, GripVertical } from "lucide-react"
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
import { uploadImageToStorage } from "@/app/actions/storage"

interface SortableOptionItemProps {
  option: Alternative
  exerciseId: string
}

export function SortableOptionItem({ option, exerciseId }: SortableOptionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(option.content)
  const [editedExplanation, setEditedExplanation] = useState(option.explanation || "")
  const [editedIsCorrect, setEditedIsCorrect] = useState(option.is_correct)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>((option as any).image_url || ((option as any).image_urls && (option as any).image_urls[0]) || null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSave = async () => {
    if (!editedContent.trim()) {
      alert("Option content cannot be empty.")
      return
    }
    setIsSaving(true)
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
        console.error("Failed to save option:", result.error)
        alert("Failed to save option. Please try again.")
      }
    } catch (error) {
      console.error("Error saving option:", error)
      alert("An error occurred while saving. Please try again.")
    } finally {
      setIsSaving(false)
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
        alert(result.error || "Failed to delete option. Please try again.")
      }
    } catch (error) {
      console.error("Error deleting option:", error)
      alert("An error occurred while deleting. Please try again.")
    } finally {
      setIsDeleting(false)
    }
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

  if (isEditing) {
    return (
      <Card className="border-emerald-500 bg-emerald-500/10">
        <CardContent className="p-4">
          <div className="grid gap-3">
            <Input
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Option content"
              className="bg-muted border-border text-foreground"
              autoFocus
            />
            {!editedContent.trim() && (
              <p className="text-xs text-red-400">Option content is required.</p>
            )}
            <Textarea
              value={editedExplanation}
              onChange={(e) => setEditedExplanation(e.target.value)}
              placeholder="Explanation (optional)"
              className="bg-muted border-border text-foreground"
              rows={2}
            />
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Option Image (one)</label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://..."
                  defaultValue={editedImageUrl || ""}
                  onBlur={(e) => setEditedImageUrl(e.target.value.trim() || null)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const inp = document.createElement('input')
                    inp.type = 'file'
                    inp.accept = 'image/*'
                    inp.onchange = async (ev: any) => {
                      const file = ev.target.files?.[0]
                      if (!file) return
                      setIsSaving(true)
                      try {
                        const res = await uploadImageToStorage(file)
                        if (res.success && res.url) setEditedImageUrl(res.url)
                      } finally {
                        setIsSaving(false)
                      }
                    }
                    inp.click()
                  }}
                  disabled={isSaving}
                >Upload</Button>
                {editedImageUrl && (
                  <Button size="sm" variant="outline" onClick={() => setEditedImageUrl(null)} disabled={isSaving}>Clear</Button>
                )}
              </div>
              {editedImageUrl && <img src={editedImageUrl} alt="Option preview" className="mt-2 h-20 w-auto rounded border" />}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`edit-is-correct-${option.id}`}
                checked={editedIsCorrect}
                onCheckedChange={(checked) => setEditedIsCorrect(checked as boolean)}
                className="border-gray-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <label
                htmlFor={`edit-is-correct-${option.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
              >
                This is the correct answer
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={async () => {
                await updateAlternative(option.id, exerciseId, { content: editedContent, explanation: editedExplanation || undefined, image_url: editedImageUrl ?? null })
                handleSave()
              }} disabled={isSaving || !editedContent.trim()} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                <Check className="w-3 h-3 mr-1" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving} className="bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-accent">
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`group ${option.is_correct ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border bg-card'} ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={option.is_correct}
                onCheckedChange={handleCorrectnessToggle}
                className="border-gray-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="font-medium text-foreground">{option.content}</span>
            </div>
            {/* Image previews for admin */}
            {(() => {
              const imgs: string[] = (option as any).image_urls && (option as any).image_urls.length > 0
                ? (option as any).image_urls.slice(0,4)
                : ((option as any).image_url ? [(option as any).image_url] : [])
              if (imgs.length === 0) return null
              if (imgs.length === 1) {
                return (
                  <div className="ml-6 mb-2 relative w-full pt-[56%] bg-muted rounded border overflow-hidden">
                    <img src={imgs[0]} alt="Option image" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                )
              }
              return (
                <div className="ml-6 mb-2 grid grid-cols-2 gap-2">
                  {imgs.map((u, i) => (
                    <div key={i} className="relative w-full pt-[100%] bg-muted rounded border overflow-hidden">
                      <img src={u} alt={`Option image ${i+1}`} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )
            })()}
            {option.explanation && (
              <p className="text-sm text-muted-foreground ml-6">
                {option.explanation}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Drag Handle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3 w-3" />
              <span className="sr-only">Drag to reorder</span>
            </Button>
            
            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent"
                  disabled={isDeleting}
                >
                  <MoreVertical className="h-3 w-3" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-muted border-border">
                <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-muted-foreground focus:bg-accent focus:text-foreground">
                  <Edit className="mr-2 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
