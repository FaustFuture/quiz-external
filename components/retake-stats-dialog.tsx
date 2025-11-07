"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getModuleRetakeStats } from "@/app/actions/results"
import { BarChart3, Users, TrendingUp, Award } from "lucide-react"

interface RetakeStatsDialogProps {
  moduleId: string
  moduleTitle: string
  moduleType?: 'module' | 'exam'
}

export function RetakeStatsDialog({ moduleId, moduleTitle, moduleType }: RetakeStatsDialogProps) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const result = await getModuleRetakeStats(moduleId)
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("Error loading retake stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadStats()
    }
  }, [open, moduleId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 min-w-[140px]">
          <BarChart3 className="h-4 w-4" />
          Retake Stats
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Retake Statistics - {moduleTitle}</DialogTitle>
          <DialogDescription>
            Track how many times each {moduleType === 'exam' ? 'exam' : 'quiz'} was taken and the corresponding scores
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading statistics...</div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {stats.totalSubmissions}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unique Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {stats.uniqueUsers}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {stats.uniqueUsers > 0 ? (stats.totalSubmissions / stats.uniqueUsers).toFixed(1) : 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Statistics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">User Performance</h3>
              <div className="space-y-3">
                {stats.userStats.map((user: any, index: number) => (
                  <Card key={user.user_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{user.user_name || `User ${user.user_id.slice(0, 8)}`}</h4>
                          <p className="text-sm text-muted-foreground">
                            {user.totalAttempts} attempt{user.totalAttempts !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Best: {user.bestScore}%</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{user.bestScore}%</div>
                          <div className="text-muted-foreground">Best Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{user.latestScore}%</div>
                          <div className="text-muted-foreground">Latest Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{user.averageScore}%</div>
                          <div className="text-muted-foreground">Average Score</div>
                        </div>
                      </div>
                      
                      {/* Attempt History */}
                      <div className="mt-3 pt-3 border-t">
                        <h5 className="text-sm font-medium mb-2">Attempt History</h5>
                        <div className="flex flex-wrap gap-2">
                          {user.attempts.map((attempt: any, attemptIndex: number) => (
                            <div
                              key={attempt.id}
                              className={`px-2 py-1 rounded text-xs ${
                                attempt.score >= 80 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : attempt.score >= 60
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              #{attemptIndex + 1}: {attempt.score}%
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No retake data available for this module.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
