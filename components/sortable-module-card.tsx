"use client"

import { useState, useCallback, memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Trash2, MoreVertical, GripVertical, AlertTriangle, Share2, Check } from "lucide-react"
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

// PERFORMANCE OPTIMIZATION: Memoize component to prevent unnecessary re-renders
// This component re-renders frequently due to drag-and-drop operations
const SortableModuleCardComponent = ({ module, companyId, isActive = false, onModuleDeleted }: SortableModuleCardProps) => {
	const [isDeleting, setIsDeleting] = useState(false)
	const [isConfirmOpen, setIsConfirmOpen] = useState(false)
	const [isShareOpen, setIsShareOpen] = useState(false)
	const [isCopied, setIsCopied] = useState(false)
	const router = useRouter()

	const shareUrl = typeof window !== 'undefined'
		? `${window.location.origin}/quiz/${module.id}`
		: `/quiz/${module.id}`

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

	// PERFORMANCE OPTIMIZATION: Memoize callbacks to prevent unnecessary re-renders of child components
	const handleDelete = useCallback(async (e: React.MouseEvent) => {
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
	}, [module.id, companyId, onModuleDeleted, router])

	const handleCardClick = useCallback(() => {
		router.push(`/dashboard/${companyId}/modules/${module.id}`)
	}, [router, companyId, module.id])

	const handleShare = useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
		setIsShareOpen(true)
	}, [])

	const handleCopyLink = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(shareUrl)
			setIsCopied(true)
			setTimeout(() => setIsCopied(false), 2000)
		} catch (error) {
			console.error("Failed to copy link:", error)
			// Fallback for older browsers
			const textArea = document.createElement("textarea")
			textArea.value = shareUrl
			document.body.appendChild(textArea)
			textArea.select()
			document.execCommand("copy")
			document.body.removeChild(textArea)
			setIsCopied(true)
			setTimeout(() => setIsCopied(false), 2000)
		}
	}, [shareUrl])

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={`relative group hover:shadow-xl cursor-pointer border-border bg-card hover:bg-muted hover:border-emerald-500/50 w-full h-64 flex flex-col ${isDragging ? 'opacity-50 z-50' : ''
				}`}
			onClick={handleCardClick}
		>
			<CardHeader className="pb-3 flex-1">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<span className={`px-2 py-1 text-xs rounded-full ${module.type === 'exam'
									? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
									: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
								}`}>
								{module.type === 'exam' ? 'Exam' : 'Quiz'}
							</span>
							{module.type === 'exam' && (
								<span className={`px-2 py-1 text-xs rounded-full ${module.is_unlocked
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
					<div className="flex flex-col gap-1" suppressHydrationWarning>
						{/* Drag Handle */}
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white hover:bg-gray-800"
							{...attributes}
							{...listeners}
							onClick={(e) => e.stopPropagation()}
							suppressHydrationWarning
						>
							<GripVertical className="h-4 w-4" />
							<span className="sr-only">Drag to reorder</span>
						</Button>

						{/* Share Button */}
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
							onClick={handleShare}
						>
							<Share2 className="h-4 w-4" />
							<span className="sr-only">Share quiz link</span>
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
			<Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
				<DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md border-emerald-500/30">
					<DialogHeader>
						<DialogTitle className="text-xl">Share Quiz Link</DialogTitle>
						<DialogDescription>
							Share this link with others so they can take the quiz as guests. They won't need to create an account.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="flex items-center gap-2 space-x-2">
							<div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono break-all">
								{shareUrl}
							</div>
							<Button
								variant="outline"
								size="icon"
								onClick={handleCopyLink}
								className="shrink-0"
							>
								{isCopied ? (
									<Check className="h-4 w-4 text-green-500" />
								) : (
									<Share2 className="h-4 w-4" />
								)}
							</Button>
						</div>
						{isCopied && (
							<p className="text-sm text-green-500">Link copied to clipboard!</p>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={(e) => { e.stopPropagation(); setIsShareOpen(false) }}
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
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

// PERFORMANCE OPTIMIZATION: Export memoized version to prevent re-renders when props haven't changed
export const SortableModuleCard = memo(SortableModuleCardComponent)
