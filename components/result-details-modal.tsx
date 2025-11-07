"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getResultWithAnswers } from "@/app/actions/results"
import { CheckCircle, XCircle, Clock, Trophy, Loader2, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface ResultDetailsModalProps {
  resultId: string
  open: boolean
  onClose: () => void
  moduleType?: 'module' | 'exam'
}

export function ResultDetailsModal({ resultId, open, onClose, moduleType }: ResultDetailsModalProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open && resultId) {
      setIsLoading(true)
      getResultWithAnswers(resultId).then((response) => {
        if (response.success) {
          setData(response.data)
        }
        setIsLoading(false)
      })
    }
  }, [resultId, open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <Card className="relative z-10 w-full max-w-3xl max-h-[90vh] mx-4 shadow-lg bg-card border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-emerald-500" />
            <h2 className="text-2xl font-semibold text-foreground">{moduleType === 'exam' ? 'Exam Results' : 'Quiz Results'}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <div className="p-6">
              <div className="space-y-6">
                {/* Summary Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">User</p>
                      <p className="font-medium text-gray-200">{data.result.user_name || data.result.user_id}</p>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg text-2xl font-bold ${
                        data.result.score >= 70
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {Math.round(data.result.score)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg border border-border">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-500">
                        {data.result.correct_answers}
                      </p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">
                        {data.result.total_questions - data.result.correct_answers}
                      </p>
                      <p className="text-xs text-muted-foreground">Incorrect</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{data.result.total_questions}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Submitted {new Date(data.result.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Answers Section */}
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-4">Question Responses</h3>
                  
                  <div className="max-h-[30vh] overflow-y-auto overflow-x-hidden break-words">
                    <div className="space-y-4 pr-4">
                  {data.answers.map((answer: any, index: number) => (
                    <div
                      key={answer.id}
                      className={`p-4 rounded-lg border-2 ${
                        answer.is_correct
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-red-500/50 bg-red-500/10"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Question Number & Status */}
                        <div className="flex-shrink-0">
                          {answer.is_correct ? (
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500" />
                          )}
                        </div>

                        {/* Question Details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-foreground">
                              Question {index + 1}: {answer.exercises?.question}
                            </h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {answer.time_spent_seconds}s
                            </span>
                          </div>

                          {/* User's Answer */}
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">User's Answer:</p>
                            <div
                              className={`p-2 rounded border ${
                                answer.is_correct
                                  ? "bg-emerald-500/5 border-emerald-500/30"
                                  : "bg-red-500/5 border-red-500/30"
                              }`}
                            >
                              <p className="text-sm font-medium text-foreground">
                                {answer.alternatives?.content}
                              </p>
                              {answer.alternatives?.explanation && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {answer.alternatives.explanation}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Show correct answer if user was wrong */}
                          {!answer.is_correct && answer.alternatives?.is_correct === false && (
                            <div className="space-y-1 mt-2">
                              <p className="text-sm text-muted-foreground">
                                ℹ️ This answer was incorrect
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </Card>
    </div>
  )
}

