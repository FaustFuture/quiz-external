"use client"

import { memo } from "react"
import Image from "next/image"
import { Maximize2 } from "lucide-react"

/**
 * PERFORMANCE OPTIMIZATION: Memoized component for rendering question media (images/videos)
 * Extracted from ExamInterface to reduce component size and improve re-render performance
 */

interface QuestionMediaProps {
  videoUrl?: string | null
  imageUrls?: string[]
  imageUrl?: string | null
  imageSize?: "aspect-ratio" | "large" | "medium" | "small"
  imageLayout?: 'grid' | 'carousel' | 'vertical' | 'horizontal'
  onFullscreenImage: (url: string) => void
  onFullscreenVideo: (url: string) => void
}

const QuestionMediaComponent = ({
  videoUrl,
  imageUrls = [],
  imageUrl,
  imageSize = "aspect-ratio",
  imageLayout,
  onFullscreenImage,
  onFullscreenVideo
}: QuestionMediaProps) => {
  const getImageHeightClass = () => {
    switch (imageSize) {
      case "large": return "h-[50vh]"
      case "medium": return "h-[35vh]"
      case "small": return "h-[25vh]"
      case "aspect-ratio":
      default: return "h-auto"
    }
  }

  // Determine actual images to display
  const imgs = imageUrls && imageUrls.length > 0
    ? imageUrls.slice(0, 4)
    : (imageUrl ? [imageUrl] : [])

  const layout = imageLayout || (imgs.length === 2 ? 'horizontal' : imgs.length === 3 ? 'carousel' : 'grid')

  return (
    <>
      {/* Video if available */}
      {videoUrl && (
        <div className="relative w-full mb-4 rounded-lg overflow-hidden border border-border bg-black group">
          {/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(videoUrl) ? (
            <iframe
              src={`https://www.youtube.com/embed/${(() => {
                const m = videoUrl.match(/(?:v=|youtu\.be\/)([^&\/?#]+)/)
                return m ? m[1] : ""
              })()}`}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (/^https?:\/\/(www\.)?vimeo\.com\//.test(videoUrl) ? (
            <iframe
              src={videoUrl.replace("vimeo.com", "player.vimeo.com/video")}
              className="w-full aspect-video"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video controls className="w-full aspect-video">
              <source src={videoUrl} />
            </video>
          ))}
          <button
            onClick={() => onFullscreenVideo(videoUrl)}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Images */}
      {imgs.length > 0 && (
        <QuestionImages
          images={imgs}
          layout={layout}
          heightClass={getImageHeightClass()}
          onFullscreen={onFullscreenImage}
        />
      )}
    </>
  )
}

// Sub-component for rendering images
interface QuestionImagesProps {
  images: string[]
  layout: 'grid' | 'carousel' | 'vertical' | 'horizontal'
  heightClass: string
  onFullscreen: (url: string) => void
}

const QuestionImages = memo(({ images, layout, heightClass, onFullscreen }: QuestionImagesProps) => {
  if (images.length === 0) return null

  // Single image
  if (images.length === 1) {
    return (
      <div className="relative w-full mb-4 rounded-lg overflow-hidden bg-muted border border-border group">
        <div className={`relative w-full ${heightClass} flex items-center justify-center`}>
          <Image
            src={images[0]}
            alt="Question image"
            width={800}
            height={600}
            className={`w-full ${heightClass} object-cover rounded-lg`}
            priority
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs font-bold rounded">1</div>
          <button
            onClick={() => onFullscreen(images[0])}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Multiple images - 2 images
  if (images.length === 2) {
    const gridClass = layout === 'vertical' ? 'grid-cols-1' : 'grid-cols-2'
    return (
      <div className={`relative w-full mb-4 rounded-lg overflow-hidden bg-muted border border-border p-2 ${heightClass}`}>
        <div className={`grid ${gridClass} gap-2 h-full`}>
          {images.map((url, i) => (
            <ImageThumbnail key={i} url={url} index={i} onFullscreen={onFullscreen} />
          ))}
        </div>
      </div>
    )
  }

  // 3 images - carousel
  if (images.length === 3) {
    return (
      <div className={`relative w-full mb-4 rounded-lg overflow-hidden bg-muted border border-border p-2 ${heightClass}`}>
        <div className="flex gap-4 h-full overflow-x-auto scrollbar-hide">
          {images.map((url, i) => (
            <div key={i} className="relative w-80 h-full group flex-shrink-0">
              <img src={url} alt={`Question image ${i+1}`} className="w-full h-full object-cover rounded" />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs font-bold rounded">{i + 1}</div>
              <button
                onClick={() => onFullscreen(url)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 4 images - grid or carousel
  if (layout === 'carousel') {
    return (
      <div className={`relative w-full mb-4 rounded-lg overflow-hidden bg-muted border border-border p-2 ${heightClass}`}>
        <div className="flex gap-4 h-full overflow-x-auto scrollbar-hide">
          {images.map((url, i) => (
            <div key={i} className="relative w-80 h-full group flex-shrink-0">
              <img src={url} alt={`Question image ${i+1}`} className="w-full h-full object-cover rounded" />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs font-bold rounded">{i + 1}</div>
              <button
                onClick={() => onFullscreen(url)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Default grid layout
  return (
    <div className={`relative w-full mb-4 rounded-lg overflow-hidden bg-muted border border-border p-2 ${heightClass}`}>
      <div className="grid grid-cols-2 gap-2 h-full">
        {images.map((url, i) => (
          <ImageThumbnail key={i} url={url} index={i} onFullscreen={onFullscreen} />
        ))}
      </div>
    </div>
  )
})

// Helper component for image thumbnails
const ImageThumbnail = memo(({ url, index, onFullscreen }: { url: string, index: number, onFullscreen: (url: string) => void }) => (
  <div className="relative w-full h-full group">
    <img src={url} alt={`Question image ${index+1}`} className="w-full h-full object-cover rounded" />
    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs font-bold rounded">{index + 1}</div>
    <button
      onClick={() => onFullscreen(url)}
      className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <Maximize2 className="w-3 h-3" />
    </button>
  </div>
))

QuestionImages.displayName = 'QuestionImages'
ImageThumbnail.displayName = 'ImageThumbnail'

export const QuestionMedia = memo(QuestionMediaComponent)
QuestionMedia.displayName = 'QuestionMedia'

