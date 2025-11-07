"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Trash2, MoreVertical, GripVertical, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { type Module } from "@/app/actions/modules"
import { deleteModule } from "@/app/actions/modules"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface SortableModuleCardProps {
  module: Module
  companyId: string
  isActive?: boolean
  onModuleDeleted?: () => void
}

export function SortableModuleCard({ module, companyId, isActive = false, onModuleDeleted }: SortableModuleCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const router = useRouter()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setIsDeleting(true)
    
    try {
      const result = await deleteModule(module.id, companyId)
      
      if (result.success) {
        // Call the callback to refetch modules
        if (onModuleDeleted) {
          onModuleDeleted()
        }
        // Also refresh the router as backup
        router.refresh()
        setIsConfirmOpen(false)
      } else {
        console.error("Failed to delete module:", result.error)
        alert("Failed to delete module. Please try again.")
      }
    } catch (error) {
      console.error("Error deleting module:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCardClick = () => {
    router.push(`/dashboard/${companyId}/modules/${module.id}`)
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`relative group hover:shadow-xl cursor-pointer border-border bg-card hover:bg-muted hover:border-emerald-500/50 w-full h-64 flex flex-col ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 text-xs rounded-full ${
                module.type === 'exam'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              }`}>
                {module.type === 'exam' ? 'Exam' : 'Quiz'}
              </span>
              {module.type === 'exam' && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  module.is_unlocked
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {module.is_unlocked ? 'Unlocked' : 'Locked'}
                </span>
              )}
            </div>
            <CardTitle className="text-lg text-foreground line-clamp-2">{module.title}</CardTitle>
            {module.description && (
              <CardDescription className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                {module.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {/* Drag Handle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white hover:bg-gray-800"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
              <span className="sr-only">Drag to reorder</span>
            </Button>
            
            {/* Delete Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
              disabled={isDeleting}
              onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(true) }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete module</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Created {new Date(module.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md border-emerald-500/30">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl">Delete module?</DialogTitle>
              <DialogDescription>
                You are about to permanently delete <span className="font-medium text-emerald-400">{module.title}</span>. This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(false) }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              autoFocus
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
