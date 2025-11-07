"use client"

import { useState, useRef } from "react"
import { Upload, Link, X, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { uploadImageToStorage, validateImageUrl } from "@/app/actions/storage"

interface ImageUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentImageUrl?: string
  onImageChange: (imageUrl: string) => void
}

export function ImageUploadDialog({ 
  open, 
  onOpenChange, 
  currentImageUrl, 
  onImageChange 
}: ImageUploadDialogProps) {
  const [url, setUrl] = useState(currentImageUrl || "")
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      return
    }

    setIsLoading(true)
    
    try {
      const result = await validateImageUrl(url)
      
      if (result.success) {
        onImageChange(url)
        onOpenChange(false)
      } else {
        alert(result.error || "Invalid image URL. Please check the URL and try again.")
      }
    } catch (error) {
      console.error("Error validating image URL:", error)
      alert("Invalid image URL. Please check the URL and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (!file) {
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file.")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.")
      return
    }

    setIsLoading(true)
    
    try {
      const result = await uploadImageToStorage(file)
      
      if (result.success && result.url) {
        onImageChange(result.url)
        onOpenChange(false)
      } else {
        alert(result.error || "Failed to upload image. Please try again.")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Error uploading file. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveImage = () => {
    onImageChange("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Change Exercise Image</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload an image from your device or enter an image URL.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted border-border">
            <TabsTrigger value="upload" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-foreground">Upload File</TabsTrigger>
            <TabsTrigger value="url" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-foreground">Image URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-foreground">Choose Image File</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full bg-muted border-border text-foreground hover:text-foreground hover:bg-accent hover:border-emerald-500"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isLoading ? "Processing..." : "Choose File"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Supported formats: JPG, PNG, GIF, WebP (max 5MB)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
              <Label htmlFor="image-url" className="text-foreground">Image URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading || !url.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                  <Link className="mr-2 h-4 w-4" />
                  {isLoading ? "Validating..." : "Use URL"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        {currentImageUrl && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current image:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                className="bg-muted text-red-500 hover:text-red-500 border-border hover:bg-red-500/10"
              >
                <X className="mr-2 h-4 w-4" />
                Remove Image
              </Button>
            </div>
            <div className="mt-2">
              <img
                src={currentImageUrl}
                alt="Current exercise image"
                className="w-full h-32 object-cover rounded-lg border border-gray-200/10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
