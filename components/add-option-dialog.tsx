"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createAlternative, getAlternatives } from "@/app/actions/alternatives"
import { uploadImageToStorage } from "@/app/actions/storage"
import { useRouter } from "next/navigation"

interface AddOptionDialogProps {
  exerciseId: string
}

export function AddOptionDialog({ exerciseId }: AddOptionDialogProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [isCorrect, setIsCorrect] = useState(false)
  const [explanation, setExplanation] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [existingAlternatives, setExistingAlternatives] = useState<any[]>([])
  const [hasCorrectAlternative, setHasCorrectAlternative] = useState(false)
  const router = useRouter()

  // Check if this is the first alternative or if there are no correct alternatives
  useEffect(() => {
    const checkAlternatives = async () => {
      const alternatives = await getAlternatives(exerciseId)
      setExistingAlternatives(alternatives)
      setHasCorrectAlternative(alternatives.some(alt => alt.is_correct))
      
      // If this is the first alternative or no correct alternative exists, make it correct by default
      if (alternatives.length === 0 || !alternatives.some(alt => alt.is_correct)) {
        setIsCorrect(true)
      }
    }
    
    if (open) {
      checkAlternatives()
    }
  }, [exerciseId, open])

  const resetForm = () => {
    setContent("")
    setExplanation("")
    setIsCorrect(false)
    setImageUrl("")
    setExistingAlternatives([])
    setHasCorrectAlternative(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      return
    }

    setIsLoading(true)
    
    try {
      const result = await createAlternative(exerciseId, content, isCorrect, explanation, imageUrl || null, null)
      
      if (result.success) {
        resetForm()
        setOpen(false)
        // Preserve current exercise view after refresh
        try {
          const path = typeof window !== 'undefined' ? window.location.pathname : ''
          if (path) router.replace(`${path}?exerciseId=${exerciseId}`)
        } catch {}
        router.refresh()
      } else {
        console.error("Failed to create alternative:", result.error)
        alert("Failed to create option. Please try again.")
      }
    } catch (error) {
      console.error("Error creating alternative:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-accent hover:border-emerald-500">
          <Plus className="h-4 w-4" />
          Add Option
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Option</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new answer option for this exercise. {existingAlternatives.length === 0 ? "This will be marked as correct by default since it's the first option." : "Mark it as correct if it's the right answer."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="content" className="text-foreground">
                Option Content <span className="text-red-400">*</span>
              </Label>
              <Input
                id="content"
                placeholder="e.g., Hello World"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                autoFocus
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-correct"
                checked={isCorrect}
                onCheckedChange={(checked) => setIsCorrect(checked as boolean)}
                disabled={existingAlternatives.length === 0 || !hasCorrectAlternative}
                className="border-gray-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <Label htmlFor="is-correct" className="text-sm font-medium text-foreground">
                {existingAlternatives.length === 0 || !hasCorrectAlternative 
                  ? "This is the correct answer (required for first option)" 
                  : "This is the correct answer"}
              </Label>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="explanation" className="text-foreground">Explanation (optional)</Label>
              <Textarea
                id="explanation"
                placeholder="Explain why this option is correct or incorrect..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-foreground">Option Image (one)</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={async () => {
                  try {
                    const inp = document.createElement('input')
                    inp.type = 'file'
                    inp.accept = 'image/*'
                    inp.onchange = async (ev: any) => {
                      const file = ev.target.files?.[0]
                      if (!file) return
                      setIsLoading(true)
                      try {
                        const res = await uploadImageToStorage(file)
                        if (res.success && res.url) setImageUrl(res.url)
                        else alert(res.error || 'Upload failed')
                      } finally {
                        setIsLoading(false)
                      }
                    }
                    inp.click()
                  } catch {}
                }}
                className="bg-muted border-border text-foreground hover:text-foreground hover:bg-accent hover:border-emerald-500"
              >Upload</Button>
              {imageUrl && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setImageUrl("")}
                  className="bg-muted border-border text-foreground hover:text-foreground hover:bg-accent hover:border-red-500"
                >Remove</Button>
              )}
            </div>
            {imageUrl && (
              <div className="relative w-full h-48 rounded border overflow-auto mt-2">
                <img src={imageUrl} alt="Option preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !content.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {isLoading ? "Adding..." : "Add Option"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
