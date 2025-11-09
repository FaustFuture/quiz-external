"use client"

import { memo } from "react"
import Image from "next/image"
import { X } from "lucide-react"

/**
 * PERFORMANCE OPTIMIZATION: Memoized fullscreen media modals
 * Extracted from ExamInterface to reduce component size
 */

interface FullscreenImageProps {
  imageUrl: string | null
  onClose: () => void
}

const FullscreenImageComponent = ({ imageUrl, onClose }: FullscreenImageProps) => {
  if (!imageUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full h-full flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70"
        >
          <X className="h-6 w-6" />
        </button>
        <Image
          src={imageUrl}
          alt="Fullscreen image"
          width={1200}
          height={800}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>
    </div>
  )
}

interface FullscreenVideoProps {
  videoUrl: string | null
  onClose: () => void
}

const FullscreenVideoComponent = ({ videoUrl, onClose }: FullscreenVideoProps) => {
  if (!videoUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full h-full flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="w-full h-full flex items-center justify-center">
          {/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(videoUrl) ? (
            <iframe
              src={`https://www.youtube.com/embed/${(() => {
                const m = videoUrl.match(/(?:v=|youtu\.be\/)([^&/?#]+)/)
                return m ? m[1] : ""
              })()}`}
              className="aspect-video max-w-full max-h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (/^https?:\/\/(www\.)?vimeo\.com\//.test(videoUrl) ? (
            <iframe
              src={videoUrl.replace("vimeo.com", "player.vimeo.com/video")}
              className="aspect-video max-w-full max-h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video controls className="max-w-full max-h-full object-contain">
              <source src={videoUrl} />
            </video>
          ))}
        </div>
      </div>
    </div>
  )
}

export const FullscreenImage = memo(FullscreenImageComponent)
FullscreenImage.displayName = 'FullscreenImage'

export const FullscreenVideo = memo(FullscreenVideoComponent)
FullscreenVideo.displayName = 'FullscreenVideo'

