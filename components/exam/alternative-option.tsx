"use client"

import { memo } from "react"
import { Check, X, Maximize2 } from "lucide-react"
import type { Alternative } from "@/app/actions/alternatives"

/**
 * PERFORMANCE OPTIMIZATION: Memoized component for rendering individual alternative options
 * Extracted from ExamInterface to reduce component size and improve re-render performance
 */

interface AlternativeOptionProps {
  alternative: Alternative
  isSelected: boolean
  hasAnswered: boolean
  isCorrect: boolean
  onSelect?: (id: string) => void
  onFullscreenImage: (url: string) => void
}

const AlternativeOptionComponent = ({
  alternative,
  isSelected,
  hasAnswered,
  isCorrect,
  onSelect,
  onFullscreenImage
}: AlternativeOptionProps) => {
  const getStyle = () => {
    if (!hasAnswered) {
      return "border-border hover:border-primary cursor-pointer"
    }

    if (isSelected) {
      if (isCorrect) {
        return "border-green-500 bg-green-50 dark:bg-green-950"
      } else {
        return "border-red-500 bg-red-50 dark:bg-red-950"
      }
    }

    // Show the correct answer if user selected wrong
    if (alternative.is_correct && !isCorrect) {
      return "border-green-500 bg-green-50 dark:bg-green-950"
    }

    return "border-border opacity-50"
  }

  const getIcon = () => {
    if (!hasAnswered) return null

    if (isSelected) {
      if (isCorrect) {
        return <Check className="h-5 w-5 text-green-600" />
      } else {
        return <X className="h-5 w-5 text-red-600" />
      }
    }

    // Show the correct answer if user selected wrong
    if (alternative.is_correct && !isCorrect) {
      return <Check className="h-5 w-5 text-green-600" />
    }

    return null
  }

  // Get images
  const imgs: string[] = (alternative as any).image_urls && (alternative as any).image_urls.length > 0
    ? (alternative as any).image_urls.slice(0, 4)
    : ((alternative as any).image_url ? [(alternative as any).image_url] : [])

  return (
    <div
      onClick={() => onSelect && !hasAnswered && onSelect(alternative.id)}
      className={`p-4 rounded-lg border-2 transition-all ${getStyle()} ${!hasAnswered ? "hover:shadow-md" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Alternative Images */}
          {imgs.length > 0 && (
            <AlternativeImages images={imgs} onFullscreen={onFullscreenImage} />
          )}
          
          <p className="font-medium">{alternative.content}</p>
          
          {/* Show explanation if answered and this is selected or correct */}
          {hasAnswered && alternative.explanation && (isSelected || alternative.is_correct) && (
            <p className="text-sm text-muted-foreground mt-2">
              {alternative.explanation}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
      </div>
    </div>
  )
}

// Sub-component for alternative images
interface AlternativeImagesProps {
  images: string[]
  onFullscreen: (url: string) => void
}

const AlternativeImages = memo(({ images, onFullscreen }: AlternativeImagesProps) => {
  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <div className="mb-2 relative w-full pt-[56%] bg-muted rounded border overflow-hidden group">
        <img src={images[0]} alt="Option image" className="absolute inset-0 h-full w-full object-cover" />
        <button
          onClick={(e) => { e.stopPropagation(); onFullscreen(images[0]); }}
          className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="mb-2 grid grid-cols-2 gap-2">
      {images.map((url, i) => (
        <div key={i} className="relative w-full pt-[100%] bg-muted rounded border overflow-hidden group">
          <img src={url} alt={`Option image ${i+1}`} className="absolute inset-0 h-full w-full object-cover" />
          <button
            onClick={(e) => { e.stopPropagation(); onFullscreen(url); }}
            className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-2 h-2" />
          </button>
        </div>
      ))}
    </div>
  )
})

AlternativeImages.displayName = 'AlternativeImages'

export const AlternativeOption = memo(AlternativeOptionComponent)
AlternativeOption.displayName = 'AlternativeOption'

