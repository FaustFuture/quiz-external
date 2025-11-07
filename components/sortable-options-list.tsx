"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { SortableOptionItem } from "@/components/sortable-option-item"
import { type Alternative } from "@/app/actions/alternatives"
import { updateAlternativeOrder } from "@/app/actions/alternatives"
import { useRouter } from "next/navigation"

interface SortableOptionsListProps {
  alternatives: Alternative[]
  exerciseId: string
}

export function SortableOptionsList({ alternatives, exerciseId }: SortableOptionsListProps) {
  const [items, setItems] = useState(alternatives)
  const [activeId, setActiveId] = useState<string | null>(null)
  const router = useRouter()

  // Update items when alternatives prop changes
  useEffect(() => {
    setItems(alternatives)
  }, [alternatives])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      // Update local state immediately for better UX
      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)

      // Update the order in the database
      try {
        const movedAlternative = newItems[newIndex]
        const result = await updateAlternativeOrder(movedAlternative.id, newIndex, exerciseId)
        
        if (!result.success) {
          console.error("Failed to update alternative order:", result.error)
          // Revert to original order if the server update failed
          setItems(alternatives)
          alert("Failed to save new order. Please try again.")
        } else {
          // Refresh the page to ensure consistency
          router.refresh()
        }
      } catch (error) {
        console.error("Error updating alternative order:", error)
        // Revert to original order if there was an error
        setItems(alternatives)
        alert("An error occurred while saving the new order. Please try again.")
      }
    }
  }

  if (items.length === 0) {
    return (
      <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground">
        <p className="text-sm">No options yet</p>
        <p className="text-xs mt-1">Add alternatives for this exercise</p>
        <p className="text-xs text-red-400 mt-2">At least one option is required.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200/10 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">
                No options yet. Click "Add Option" to create answer choices for this exercise.
              </p>
            </div>
          ) : (
            items.map((alternative) => (
              <SortableOptionItem 
                key={alternative.id} 
                option={alternative} 
                exerciseId={exerciseId}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
