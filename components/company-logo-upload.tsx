"use client"

import { useState, useRef } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { uploadCompanyLogo } from "@/app/actions/company"
import { toast } from "sonner"

interface CompanyLogoUploadProps {
  companyId: string
  currentLogoUrl?: string | null
  companyName: string
  onLogoUpdate?: (logoUrl: string) => void
}

export function CompanyLogoUpload({ 
  companyId, 
  currentLogoUrl, 
  companyName, 
  onLogoUpdate 
}: CompanyLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  console.log("CompanyLogoUpload props:", { companyId, currentLogoUrl, companyName })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid File Type', {
        description: 'Please select an image file (PNG, JPG, GIF, etc.)'
      })
      return
    }

    // Validate file size (2MB limit for logos)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File Too Large', {
        description: 'Logo file size must be less than 2MB.'
      })
      return
    }

    setIsUploading(true)
    const uploadToast = toast.loading('Uploading logo...')
    
    try {
      const result = await uploadCompanyLogo(companyId, file)
      
      if (result.success && result.url) {
        toast.success('Logo uploaded successfully!', { id: uploadToast })
        onLogoUpdate?.(result.url)
        if (result.warning) {
          console.warn(result.warning)
          toast.warning('Warning', { 
            description: result.warning,
            duration: 5000 
          })
        }
      } else {
        const errorMessage = result.error || "Failed to upload logo"
        console.error("Failed to upload logo:", errorMessage)
        toast.error('Upload Failed', {
          id: uploadToast,
          description: errorMessage,
          action: {
            label: 'Try Again',
            onClick: () => fileInputRef.current?.click()
          }
        })
      }
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast.error('Upload Error', {
        id: uploadToast,
        description: 'An unexpected error occurred. Please try again.',
        action: {
          label: 'Try Again',
          onClick: () => fileInputRef.current?.click()
        }
      })
    } finally {
      setIsUploading(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (isUploading) return

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))

    if (imageFile) {
      // Create a synthetic event to reuse the existing upload handler
      const syntheticEvent = {
        target: { files: [imageFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>
      
      handleFileUpload(syntheticEvent)
    } else {
      toast.error('Invalid File', {
        description: 'Please drop an image file.'
      })
    }
  }

  const handleLogoClick = () => {
    if (isUploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className="flex items-center gap-3">
      {/* Debug info */}
      
      {/* Logo Display/Upload Area */}
      <div 
        className={`relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer group transition-all ${
          isDragOver ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background' : ''
        }`}
        onClick={handleLogoClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {currentLogoUrl ? (
          <img
            src={currentLogoUrl}
            alt={`${companyName} logo`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
        )}
        
        {/* Fallback for broken images */}
        <div className="hidden w-full h-full bg-muted flex items-center justify-center">
          <Camera className="w-6 h-6 text-gray-400" />
        </div>

        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Camera className="w-4 h-4 text-white" />
          )}
        </div>
      </div>

      {/* Company Name */}
      <h1 className="text-xl font-semibold text-foreground">{companyName}</h1>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}
