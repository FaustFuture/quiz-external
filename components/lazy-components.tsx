"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * PERFORMANCE OPTIMIZATION: Lazy load heavy components to reduce initial bundle size
 * These components are loaded on-demand when needed
 */

// Loading fallback for dialogs
const DialogLoading = () => (
  <div className="flex items-center justify-center p-8">
    <Skeleton className="h-48 w-96" />
  </div>
)

// Loading fallback for modals
const ModalLoading = () => (
  <div className="flex items-center justify-center p-8">
    <Skeleton className="h-64 w-full max-w-2xl" />
  </div>
)

// Lazy load heavy dialog components
export const AddModuleDialogLazy = dynamic(
  () => import("@/components/add-module-dialog").then(mod => ({ default: mod.AddModuleDialog })),
  {
    loading: DialogLoading,
    ssr: false,
  }
)

export const AddExerciseDialogLazy = dynamic(
  () => import("@/components/add-exercise-dialog").then(mod => ({ default: mod.AddExerciseDialog })),
  {
    loading: DialogLoading,
    ssr: false,
  }
)

export const ResultDetailsModalLazy = dynamic(
  () => import("@/components/result-details-modal").then(mod => ({ default: mod.ResultDetailsModal })),
  {
    loading: ModalLoading,
    ssr: false,
  }
)

export const RetakeStatsDialogLazy = dynamic(
  () => import("@/components/retake-stats-dialog").then(mod => ({ default: mod.RetakeStatsDialog })),
  {
    loading: DialogLoading,
    ssr: false,
  }
)

export const ImageUploadDialogLazy = dynamic(
  () => import("@/components/image-upload-dialog").then(mod => ({ default: mod.ImageUploadDialog })),
  {
    loading: DialogLoading,
    ssr: false,
  }
)

