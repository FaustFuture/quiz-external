"use client"

import { useState } from "react"
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
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { SortableModuleCard } from "@/components/sortable-module-card"
import { type Module } from "@/app/actions/modules"
import { updateModuleOrder } from "@/app/actions/modules"
import { useRouter } from "next/navigation"

interface SortableModulesListProps {
  modules: Module[]
  companyId: string
  onModuleDeleted?: () => void
}

export function SortableModulesList({ modules, companyId, onModuleDeleted }: SortableModulesListProps) {
  const [items, setItems] = useState(modules)
  const [activeId, setActiveId] = useState<string | null>(null)
  const router = useRouter()

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
        const movedModule = newItems[newIndex]
        const result = await updateModuleOrder(movedModule.id, newIndex, companyId)
        
        if (!result.success) {
          console.error("Failed to update module order:", result.error)
          // Revert to original order if the server update failed
          setItems(modules)
          alert("Failed to save new order. Please try again.")
        } else {
          // Refresh the page to ensure consistency
          router.refresh()
        }
      } catch (error) {
        console.error("Error updating module order:", error)
        // Revert to original order if there was an error
        setItems(modules)
        alert("An error occurred while saving the new order. Please try again.")
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((module) => (
            <SortableModuleCard 
              key={module.id} 
              module={module} 
              companyId={companyId}
              isActive={activeId === module.id}
              onModuleDeleted={onModuleDeleted}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
