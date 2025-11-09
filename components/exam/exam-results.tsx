"use client"

import { memo, useMemo } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Exercise } from "@/app/actions/exercises"

/**
 * PERFORMANCE OPTIMIZATION: Memoized component for displaying exam results
 * Extracted from ExamInterface to reduce component size and improve re-render performance
 */

interface AnswerRecord {
  questionId: string
  selectedAlternativeId: string
  isCorrect: boolean
  timeSpentSeconds: number
}

interface ExamResultsProps {
  answers: AnswerRecord[]
  questions: Exercise[]
  moduleType: 'module' | 'exam'
  companyId: string
  retakeStats?: any
  isLoadingStats: boolean
  hasRetakeAccess: boolean | null
  viewResults: boolean
  onRetake: () => void
  onBackToDashboard: () => void
  onBackToExam?: () => void
}

const ExamResultsComponent = ({
  answers,
  questions,
  moduleType,
  companyId,
  retakeStats,
  isLoadingStats,
  hasRetakeAccess,
  viewResults,
  onRetake,
  onBackToDashboard,
  onBackToExam
}: ExamResultsProps) => {
  // PERFORMANCE OPTIMIZATION: Memoize expensive calculations
  const { correctAnswers, totalQuestions, scorePercentage } = useMemo(() => {
    const correct = answers.filter(a => a.isCorrect).length
    const total = questions.length
    const score = (correct / total) * 100
    return {
      correctAnswers: correct,
      totalQuestions: total,
      scorePercentage: score
    }
  }, [answers, questions.length])

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-gray-200/10">
        <CardHeader>
          <CardTitle className="text-3xl text-center">
            {moduleType === 'module' ? 'Quiz Results' : 'Exam Results'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-6xl font-bold mb-4">
              {scorePercentage.toFixed(0)}%
            </div>
            <p className="text-lg text-muted-foreground">
              You got {correctAnswers} out of {totalQuestions} questions correct
            </p>
            
            {/* Retake Statistics */}
            {!isLoadingStats && retakeStats && retakeStats.totalAttempts > 0 && (
              <RetakeStatistics stats={retakeStats} />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Question Breakdown</h3>
            {questions.map((question, index) => {
              const answer = answers.find(a => a.questionId === question.id)
              return (
                <QuestionBreakdownItem
                  key={question.id}
                  question={question}
                  index={index}
                  isCorrect={answer?.isCorrect || false}
                />
              )
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button 
            onClick={onBackToDashboard}
            className="min-w-[140px]"
          >
            Back to Dashboard
          </Button>
          {viewResults && onBackToExam && (
            <Button 
              variant="outline" 
              onClick={onBackToExam}
              className="min-w-[140px]"
            >
              Back to {moduleType === 'module' ? 'Quiz' : 'Exam'}
            </Button>
          )}
          {(moduleType === 'module' || moduleType === 'exam') && (
            <Button 
              variant="outline" 
              disabled={moduleType === 'exam' && hasRetakeAccess !== true}
              onClick={onRetake}
              className="min-w-[140px]"
            >
              {moduleType === 'module' ? 'Retake Quiz' : 'Retake Exam'}
            </Button>
          )}
          {moduleType === 'exam' && hasRetakeAccess === false && (
            <div className="text-center text-sm text-muted-foreground">
              This exam cannot be retaken unless granted access by an administrator.
            </div>
          )}
          {moduleType === 'exam' && hasRetakeAccess === null && (
            <div className="text-center text-sm text-muted-foreground">
              Checking retake access...
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

// Sub-component for retake statistics
interface RetakeStatisticsProps {
  stats: any
}

const RetakeStatistics = memo(({ stats }: RetakeStatisticsProps) => (
  <div className="mt-6 p-4 bg-muted rounded-lg">
    <h4 className="font-semibold mb-3">Your Quiz History</h4>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{stats.totalAttempts}</div>
        <div className="text-muted-foreground">Total Attempts</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.bestScore}%</div>
        <div className="text-muted-foreground">Best Score</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.latestScore}%</div>
        <div className="text-muted-foreground">Latest Score</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{stats.averageScore}%</div>
        <div className="text-muted-foreground">Average Score</div>
      </div>
    </div>
  </div>
))

RetakeStatistics.displayName = 'RetakeStatistics'

// Sub-component for individual question breakdown
interface QuestionBreakdownItemProps {
  question: Exercise
  index: number
  isCorrect: boolean
}

const QuestionBreakdownItem = memo(({ question, index, isCorrect }: QuestionBreakdownItemProps) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border">
    <div className="flex-shrink-0">
      {isCorrect ? (
        <Check className="h-5 w-5 text-green-600" />
      ) : (
        <X className="h-5 w-5 text-red-600" />
      )}
    </div>
    <div className="flex-1">
      <p className="font-medium">Question {index + 1}</p>
      <p className="text-sm text-muted-foreground">{question.question}</p>
    </div>
    <div className="text-sm text-muted-foreground">
      {question.weight} {question.weight === 1 ? "point" : "points"}
    </div>
  </div>
))

QuestionBreakdownItem.displayName = 'QuestionBreakdownItem'

export const ExamResults = memo(ExamResultsComponent)
ExamResults.displayName = 'ExamResults'

