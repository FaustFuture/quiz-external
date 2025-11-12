"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ExamInterface } from "@/components/exam-interface"
import { type Exercise } from "@/app/actions/exercises"
import { type Alternative } from "@/app/actions/alternatives"
import { createGuestAccount } from "@/app/actions/guests"

interface ExamQuestion extends Exercise {
	alternatives: Alternative[]
}

interface GuestQuizFormProps {
	questions: ExamQuestion[]
	moduleTitle: string
	moduleId: string
	companyId: string
	moduleType: 'module' | 'exam'
	isUnlocked: boolean
}

export function GuestQuizForm({
	questions,
	moduleTitle,
	moduleId,
	companyId,
	moduleType,
	isUnlocked
}: GuestQuizFormProps) {
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [isStarted, setIsStarted] = useState(false)
	const [guestUserId, setGuestUserId] = useState<string | null>(null)
	const [isCreating, setIsCreating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!name.trim()) {
			return
		}

		setIsCreating(true)
		setError(null)

		try {
			// Create guest account in database
			const result = await createGuestAccount(name.trim(), email.trim() || undefined)

			if (result.success && result.data) {
				// Use just the guest_id UUID (without prefix) - will be saved directly to results table
				setGuestUserId(result.data.guest_id)
				setIsStarted(true)
			} else {
				setError(result.error || "Failed to create guest account. Please try again.")
			}
		} catch (err) {
			console.error("Error creating guest account:", err)
			setError("An error occurred. Please try again.")
		} finally {
			setIsCreating(false)
		}
	}

	// If quiz has started, show the exam interface
	if (isStarted && guestUserId) {
		return (
			<ExamInterface
				questions={questions}
				moduleTitle={moduleTitle}
				companyId={companyId}
				moduleId={moduleId}
				userId={guestUserId}
				userName={name.trim()}
				moduleType={moduleType}
				isUnlocked={isUnlocked}
			/>
		)
	}

	// Show the form to collect guest information
	return (
		<div className="max-w-md mx-auto">
			<Card>
				<CardHeader>
					<CardTitle>Start Quiz</CardTitle>
					<CardDescription>
						Please provide your information to begin the quiz
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 text-sm text-destructive">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">
								Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								type="text"
								placeholder="Enter your name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								autoFocus
								disabled={isCreating}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email (optional)</Label>
							<Input
								id="email"
								type="email"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={isCreating}
							/>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full" disabled={!name.trim() || isCreating}>
							{isCreating ? "Creating..." : "Start Quiz"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	)
}

