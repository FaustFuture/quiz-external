"use client"

import { useState, useMemo, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Trophy, CheckCircle, XCircle, Eye, Download, Filter } from "lucide-react"
import { type ResultWithModule } from "@/app/actions/results"
import { ResultDetailsModal } from "@/components/result-details-modal"
import { type Module } from "@/app/actions/modules"
import { createClientSupabaseClient } from "@/lib/supabase-client"

interface ResultsSidebarProps {
  results: ResultWithModule[]
  modules: Module[]
  companyId: string // Added for real-time subscription filtering
}

export function ResultsSidebar({ results, modules: initialModules, companyId }: ResultsSidebarProps) {
  // Real-time state management: maintain local modules state that updates via Supabase Realtime
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<"all" | "module" | "exam">("all")
  const [isExporting, setIsExporting] = useState(false)
  const [timeRange, setTimeRange] = useState<"all" | "day" | "week" | "month">("all")
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [selectedWeek, setSelectedWeek] = useState<string>(() => getISOWeekValue(new Date()))
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))

  // Real-time subscription to modules table
  useEffect(() => {
    const supabase = createClientSupabaseClient()

    console.log('[ResultsSidebar] Setting up real-time subscription for company:', companyId)
    
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        console.error('[ResultsSidebar] Not authenticated, cannot subscribe to realtime:', error)
        return
      }
      console.log('[ResultsSidebar] User authenticated:', data.user.email)
    })

    // Subscribe to changes in the modules table
    // Use a simpler channel name (removed Date.now() to allow sharing across tabs)
    const channelName = `modules-${companyId}`
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true }, // Receive own messages
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'modules',
          filter: `company_id=eq.${companyId}`, // Only listen to modules for this company
        },
        (payload) => {
          console.log('[ResultsSidebar] Real-time change received:', payload)

          if (payload.eventType === 'INSERT') {
            // Add new module to the list
            const newModule = payload.new as Module
            setModules((prevModules) => {
              // Check if module already exists to avoid duplicates
              const exists = prevModules.some(m => m.id === newModule.id)
              if (exists) return prevModules
              
              // Add to beginning of list (matches created_at DESC order)
              return [newModule, ...prevModules]
            })
            console.log('[ResultsSidebar] Module added:', newModule.title)
          } else if (payload.eventType === 'UPDATE') {
            // Update existing module
            const updatedModule = payload.new as Module
            setModules((prevModules) =>
              prevModules.map((m) =>
                m.id === updatedModule.id ? updatedModule : m
              )
            )
            console.log('[ResultsSidebar] Module updated:', updatedModule.title)
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted module
            const deletedModule = payload.old as Module
            setModules((prevModules) =>
              prevModules.filter((m) => m.id !== deletedModule.id)
            )
            console.log('[ResultsSidebar] Module deleted:', deletedModule.id)
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[ResultsSidebar] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[ResultsSidebar] ✅ Successfully subscribed to real-time updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ResultsSidebar] ❌ Failed to subscribe to real-time updates')
          console.error('[ResultsSidebar] Error details:', err)
          console.error('[ResultsSidebar] Channel name:', channelName)
          console.error('[ResultsSidebar] Company ID:', companyId)
        } else if (status === 'TIMED_OUT') {
          console.error('[ResultsSidebar] ⏱️ Subscription timed out')
        } else if (status === 'CLOSED') {
          console.warn('[ResultsSidebar] 🔌 Connection closed')
        }
      })

    // Cleanup: Unsubscribe when component unmounts
    return () => {
      console.log('[ResultsSidebar] Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [companyId]) // Re-subscribe if companyId changes

  // Sync local state when initialModules prop changes (e.g., on page refresh)
  useEffect(() => {
    setModules(initialModules)
  }, [initialModules])

  // Quick lookup for module type
  const moduleIdToType = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of modules) map[m.id] = (m as any).type || "module"
    return map
  }, [modules])

  // Options for module select honoring selected type
  const selectableModules = useMemo(() => {
    if (selectedType === "all") return modules
    return modules.filter((m) => ((m as any).type || "module") === selectedType)
  }, [modules, selectedType])

  // Filter results based on selected type and module
  const filteredResults = useMemo(() => {
    // Ensure results is always an array
    let base = results || []
    if (selectedType !== "all") {
      base = base.filter((r) => moduleIdToType[r.module_id] === selectedType)
    }
    if (selectedModuleId !== "all") {
      base = base.filter((r) => r.module_id === selectedModuleId)
    }
    return base
  }, [results, selectedModuleId, selectedType, moduleIdToType])

  // Secondary filter by selected calendar period
  const timeFilteredResults = useMemo(() => {
    if (timeRange === "all") return filteredResults

    const inSelectedDay = (dateString: string) => {
      const d = new Date(dateString)
      const yyyyMmDd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split("T")[0]
      return yyyyMmDd === selectedDate
    }

    const inSelectedWeek = (dateString: string) => {
      const [start, end] = getISOWeekRange(selectedWeek)
      const t = new Date(dateString).getTime()
      return t >= start.getTime() && t < end.getTime()
    }

    const inSelectedMonth = (dateString: string) => {
      const d = new Date(dateString)
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      return yearMonth === selectedMonth
    }

    return filteredResults.filter((r) => {
      if (timeRange === "day") return inSelectedDay(r.submitted_at)
      if (timeRange === "week") return inSelectedWeek(r.submitted_at)
      return inSelectedMonth(r.submitted_at)
    })
  }, [filteredResults, timeRange, selectedDate, selectedWeek, selectedMonth])

  // Debug logging for results (placed after useMemo definitions to avoid initialization errors)
  useEffect(() => {
    console.log('[ResultsSidebar] Results received:', results?.length || 0)
    console.log('[ResultsSidebar] Modules received:', modules?.length || 0)
    console.log('[ResultsSidebar] Filtered results:', filteredResults?.length || 0)
    console.log('[ResultsSidebar] Time filtered results:', timeFilteredResults?.length || 0)
    if (results && results.length > 0) {
      console.log('[ResultsSidebar] First result:', results[0])
    }
    if (timeFilteredResults.length === 0 && results.length > 0) {
      console.warn('[ResultsSidebar] ⚠️  Results exist but time filtering removed them all!')
      console.log('[ResultsSidebar] Current filters:', {
        selectedModuleId,
        selectedType,
        timeRange,
        selectedDate,
        selectedWeek,
        selectedMonth
      })
    }
  }, [results, modules, filteredResults, timeFilteredResults, selectedModuleId, selectedType, timeRange, selectedDate, selectedWeek, selectedMonth])

  // Prepare export data shared by CSV/XLSX
  const prepareExportData = async (): Promise<{ headers: string[]; rows: any[][]; filenameBase: string }> => {
    try {
      if (selectedModuleId === "all") {
        const headers = [
          "User ID",
          "Module",
          "Score (%)",
          "Correct Answers",
          "Total Questions",
          "Submitted At",
        ]
        const rows = timeFilteredResults.map((result) => [
          result.user_name || result.user_id,
          result.module_title,
          Math.round(result.score).toString(),
          result.correct_answers.toString(),
          result.total_questions.toString(),
          new Date(result.submitted_at).toLocaleString(),
        ])
        const filenameBase = `quiz-results-summary-${new Date().toISOString().split("T")[0]}`
        return { headers, rows, filenameBase }
      } else {
        const detailedData = await fetchDetailedResults(timeFilteredResults)
        const headers = [
          "User ID",
          "Module",
          "Score (%)",
          "Correct Answers",
          "Total Questions",
          "Submitted At",
          "Question Number",
          "Question Text",
          "Selected Answer",
          "Is Correct",
          "Time Spent (seconds)",
          "Explanation",
        ]
        const rows = detailedData.flatMap((result: any) =>
          result.answers.map((answer: any, index: number) => [
            result.user_name || result.user_id,
            result.module_title,
            Math.round(result.score).toString(),
            result.correct_answers.toString(),
            result.total_questions.toString(),
            new Date(result.submitted_at).toLocaleString(),
            (index + 1).toString(),
            answer.exercises?.question || "N/A",
            answer.alternatives?.content || "N/A",
            answer.is_correct ? "Yes" : "No",
            answer.time_spent_seconds?.toString() || "0",
            answer.alternatives?.explanation || "",
          ])
        )
        const safeModule = modules.find((m) => m.id === selectedModuleId)?.title?.replace(/[^a-zA-Z0-9]/g, "-") || "module"
        const filenameBase = `quiz-results-detailed-${safeModule}-${new Date().toISOString().split("T")[0]}`
        return { headers, rows, filenameBase }
      }
    } catch (error) {
      console.error('[ResultsSidebar] Error preparing export data:', error)
      throw new Error(`Failed to prepare export data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generate CSV data
  const generateCSV = async () => {
    setIsExporting(true)
    try {
      console.log('[ResultsSidebar] Starting CSV export...')
      const { headers, rows, filenameBase } = await prepareExportData()
      console.log('[ResultsSidebar] Export data prepared:', { headersCount: headers.length, rowsCount: rows.length })
      
      const csvContent = [headers, ...rows]
        .map((row: any[]) => row.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(","))
        .join("\n")
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${filenameBase}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('[ResultsSidebar] ✅ CSV export completed successfully')
    } catch (error) {
      console.error('[ResultsSidebar] ❌ CSV export error:', error)
      alert(`Failed to generate CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Generate XLSX
  const generateXLSX = async () => {
    setIsExporting(true)
    try {
      console.log('[ResultsSidebar] Starting XLSX export...')
      const XLSX = await ensureXLSX()
      console.log('[ResultsSidebar] XLSX library loaded successfully')
      
      const { headers, rows, filenameBase } = await prepareExportData()
      console.log('[ResultsSidebar] Export data prepared:', { headersCount: headers.length, rowsCount: rows.length })
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results")
      XLSX.writeFile(workbook, `${filenameBase}.xlsx`)
      console.log('[ResultsSidebar] ✅ XLSX export completed successfully')
    } catch (e) {
      console.error("[ResultsSidebar] ❌ XLSX export error:", e)
      alert(`Failed to generate XLSX: ${e instanceof Error ? e.message : 'Unknown error'}. Please try CSV export instead.`)
    } finally {
      setIsExporting(false)
    }
  }

  // Export to a downloadable PDF and also open a preview tab
  const exportPDF = async () => {
    setIsExporting(true)
    try {
      console.log('[ResultsSidebar] Starting PDF export...')
      const jsPDF = await ensureJsPDF()
      console.log('[ResultsSidebar] jsPDF library loaded successfully')
      
      const { headers, rows, filenameBase } = await prepareExportData()
      console.log('[ResultsSidebar] Export data prepared:', { headersCount: headers.length, rowsCount: rows.length })

      // Create PDF and table
      const doc: any = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" })
      ;(doc as any).setFontSize(14)
      ;(doc as any).text("Quiz Results", 40, 40)
      const autoTable = (doc as any).autoTable
      if (autoTable) {
        autoTable.call(doc, {
          head: [headers],
          body: rows,
          startY: 60,
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [240, 240, 240], textColor: 20 },
          margin: { left: 40, right: 40 },
        })
      }

      // Build blob once and reuse for download and preview
      const blob = doc.output("blob") as Blob
      const url = URL.createObjectURL(blob)

      // Trigger download
      const a = document.createElement("a")
      a.href = url
      a.download = `${filenameBase}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Open preview in a new tab
      window.open(url, "_blank")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      console.log('[ResultsSidebar] ✅ PDF export completed successfully')
    } catch (e) {
      console.error("[ResultsSidebar] ❌ PDF export error:", e)
      alert(`Failed to generate PDF: ${e instanceof Error ? e.message : 'Unknown error'}. Please try CSV export instead.`)
    } finally {
      setIsExporting(false)
    }
  }

  const openPrintWindow = (innerHtml: string) => {
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>Quiz Results</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; color: #111; }
        h1 { margin: 0 0 16px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f2f2f2; }
      </style>
    </head>
    <body>${innerHtml}</body></html>`
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, "_blank")
    // best-effort cleanup
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return win
  }

  // Fetch detailed results with exam answers
  const fetchDetailedResults = async (results: ResultWithModule[]) => {
    const detailedResults = await Promise.all(
      results.map(async (result) => {
        try {
          const response = await fetch(`/api/results/${result.id}/detailed`)
          if (!response.ok) {
            throw new Error(`Failed to fetch details for result ${result.id}`)
          }
          const data = await response.json()
          return {
            ...result,
            answers: data.answers || []
          }
        } catch (error) {
          console.error(`Error fetching details for result ${result.id}:`, error)
          return {
            ...result,
            answers: []
          }
        }
      })
    )
    return detailedResults
  }

  return (
    <>
      <Card className="h-full border-gray-200/10 bg-transparent">
        <CardHeader className="pb-4 border-b border-gray-200/10">
          <div className="space-y-4">
            <CardTitle className="text-xl flex items-center gap-2 text-foreground">
              <Trophy className="h-5 w-5 text-emerald-500" />
              Latest Results
            </CardTitle>
          
            {/* Module Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-foreground">Filter by {selectedType === "exam" ? "Exam" : selectedType === "module" ? "Quiz" : "Quiz/Exam"}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedModuleId === "all" 
                  ? "Summary export: Basic results for all quizzes" 
                  : "Detailed export: Includes individual question answers and explanations"
                }
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {/* Type Filter */}
                <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-9 w-[150px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="all" className="text-foreground focus:bg-accent">All types</SelectItem>
                    <SelectItem value="module" className="text-foreground focus:bg-accent">Quiz</SelectItem>
                    <SelectItem value="exam" className="text-foreground focus:bg-accent">Exam</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-9">
                    <SelectValue placeholder="All quizzes" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="all" className="text-foreground focus:bg-accent">
                      {selectedType === "exam" ? "All exams" : selectedType === "module" ? "All quizzes" : "All Quizzes and Exams"} ({filteredResults.length})
                    </SelectItem>
                    {selectableModules.map((module) => {
                      const moduleResultCount = filteredResults.filter(r => r.module_id === module.id).length
                      return (
                        <SelectItem 
                          key={module.id} 
                          value={module.id}
                          className="text-foreground focus:bg-accent"
                        >
                          {module.title} ({moduleResultCount})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {/* Time Range Filter - segmented buttons */}
              <div className="flex items-center gap-2 w-full">
                <div className="flex overflow-hidden rounded-md border border-gray-200/10">
                  {/* Day picker */}
                  <DropdownMenu onOpenChange={(open) => { if (open) setTimeRange("day") }}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`px-3 h-9 text-sm ${
                          timeRange === "day" ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                        } border-r border-gray-200/10`}
                        aria-pressed={timeRange === "day"}
                      >
                        Day
                      </button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-muted border-border">
                      <DropdownMenuLabel>Select day</DropdownMenuLabel>
                      <div className="p-2">
                        <Input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setTimeRange("day") }} className="h-8 w-[200px] bg-background border-border text-foreground" />
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Week picker */}
                  <DropdownMenu onOpenChange={(open) => { if (open) setTimeRange("week") }}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`px-3 h-9 text-sm ${
                          timeRange === "week" ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                        } border-r border-gray-200/10`}
                        aria-pressed={timeRange === "week"}
                      >
                        Week
                      </button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-muted border-border">
                      <DropdownMenuLabel>Select week</DropdownMenuLabel>
                      <div className="p-2">
                        <Input type="week" value={selectedWeek} onChange={(e) => { setSelectedWeek(e.target.value); setTimeRange("week") }} className="h-8 w-[200px] bg-background border-border text-foreground" />
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Month picker */}
                  <DropdownMenu onOpenChange={(open) => { if (open) setTimeRange("month") }}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`px-3 h-9 text-sm ${
                          timeRange === "month" ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                        } border-r border-gray-200/10`}
                        aria-pressed={timeRange === "month"}
                      >
                        Month
                      </button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-muted border-border">
                      <DropdownMenuLabel>Select month</DropdownMenuLabel>
                      <div className="p-2">
                        <Input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setTimeRange("month") }} className="h-8 w-[200px] bg-background border-border text-foreground" />
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* All */}
                  <button
                    type="button"
                    onClick={() => setTimeRange("all")}
                    className={`px-3 h-9 text-sm ${
                      timeRange === "all" ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                    }`}
                    aria-pressed={timeRange === "all"}
                  >
                    All
                  </button>
                </div>

                {/* Download dropdown */}
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700"
                        disabled={timeFilteredResults.length === 0 || isExporting}
                        title={
                          isExporting
                            ? "Exporting..."
                            : selectedModuleId === "all"
                              ? "Download summary export with basic results for all quizzes"
                              : "Download detailed export with individual question answers and explanations"
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-muted border-border">
                      <DropdownMenuLabel>Download as</DropdownMenuLabel>
                      <DropdownMenuItem onClick={generateCSV}>CSV (.csv)</DropdownMenuItem>
                      <DropdownMenuItem onClick={generateXLSX}>Excel (.xlsx)</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={exportPDF}>PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {timeFilteredResults.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {selectedModuleId === "all" 
                    ? "No exam results yet." 
                    : "No results for this quiz."}
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  {selectedModuleId === "all"
                    ? "Results will appear here when users complete exams."
                    : "Try selecting a different quiz or view all results."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200/10">
                {timeFilteredResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResultId(result.id)}
                    className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800/50 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: User and Module Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate text-foreground">
                            {result.user_name || result.user_id}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                              result.score >= 70
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {Math.round(result.score)}%
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              moduleIdToType[result.module_id] === 'exam'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}
                          >
                            {moduleIdToType[result.module_id] === 'exam' ? 'Exam' : 'Quiz'}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {result.module_title}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                            <span>{result.correct_answers}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            <span>{result.total_questions - result.correct_answers}</span>
                          </div>
                          <span>{formatRelativeTime(result.submitted_at)}</span>
                        </div>
                      </div>

                      {/* Right: View Icon */}
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedResultId && (() => {
        const selectedResult = timeFilteredResults.find(r => r.id === selectedResultId)
        const resultModuleType = selectedResult ? moduleIdToType[selectedResult.module_id] : 'module'
        return (
          <ResultDetailsModal
            resultId={selectedResultId}
            open={selectedResultId !== null}
            onClose={() => setSelectedResultId(null)}
            moduleType={resultModuleType as 'module' | 'exam'}
          />
        )
      })()}
    </>
  )
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "Just now"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Utilities for ISO week handling and dynamic XLSX import
function getISOWeekValue(date: Date): string {
  const tmp = new Date(date.getTime())
  // ISO week: Thursday in current week decides the year
  tmp.setHours(0, 0, 0, 0)
  // Set to Thursday of current week: current date + 4 - (current day number or 7)
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7))
  const yearStart = new Date(tmp.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  const year = tmp.getFullYear()
  return `${year}-W${String(weekNo).padStart(2, "0")}`
}

function getISOWeekRange(isoWeek: string): [Date, Date] {
  // isoWeek format: YYYY-Www
  const [yearStr, w] = isoWeek.split("-W")
  const year = Number(yearStr)
  const week = Number(w)
  // Start of ISO week: Monday
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = new Date(simple)
  // Monday = 1, Sunday = 0 -> convert to Monday-starting week
  const diff = (dow <= 1 ? 7 : 0) + (1 - dow)
  ISOweekStart.setDate(simple.getDate() + diff)
  const ISOweekEnd = new Date(ISOweekStart)
  ISOweekEnd.setDate(ISOweekStart.getDate() + 7)
  return [ISOweekStart, ISOweekEnd]
}

async function ensureXLSX(): Promise<any> {
  // Load SheetJS from CDN at runtime to avoid adding a dependency
  const globalAny = globalThis as any
  if (globalAny.XLSX) {
    console.log('[ensureXLSX] XLSX already loaded')
    return globalAny.XLSX
  }
  
  console.log('[ensureXLSX] Loading XLSX from CDN...')
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
    script.async = true
    script.onload = () => {
      console.log('[ensureXLSX] XLSX loaded successfully')
      resolve()
    }
    script.onerror = (error) => {
      console.error('[ensureXLSX] Failed to load XLSX library:', error)
      reject(new Error("Failed to load XLSX library from CDN. Please check your internet connection."))
    }
    document.head.appendChild(script)
  })
  
  // Verify XLSX is actually available
  if (!globalAny.XLSX) {
    throw new Error("XLSX library loaded but not available on window object")
  }
  
  return globalAny.XLSX
}

// Lightweight loader for jsPDF + autotable plugin from CDN
async function ensureJsPDF(): Promise<any> {
  const globalAny = globalThis as any
  if (globalAny.jspdf && globalAny.jspdf.jsPDF && globalAny.jspdf_autotable) {
    console.log('[ensureJsPDF] jsPDF already loaded')
    return globalAny.jspdf.jsPDF
  }
  
  console.log('[ensureJsPDF] Loading jsPDF from CDN...')
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"
    script.async = true
    script.onload = () => {
      console.log('[ensureJsPDF] jsPDF core loaded')
      resolve()
    }
    script.onerror = (error) => {
      console.error('[ensureJsPDF] Failed to load jsPDF:', error)
      reject(new Error("Failed to load jsPDF library from CDN. Please check your internet connection."))
    }
    document.head.appendChild(script)
  })
  
  console.log('[ensureJsPDF] Loading jsPDF AutoTable plugin...')
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"
    script.async = true
    script.onload = () => {
      console.log('[ensureJsPDF] jsPDF AutoTable loaded')
      resolve()
    }
    script.onerror = (error) => {
      console.error('[ensureJsPDF] Failed to load jsPDF AutoTable:', error)
      reject(new Error("Failed to load jsPDF AutoTable plugin from CDN. Please check your internet connection."))
    }
    document.head.appendChild(script)
  })
  
  // Verify jsPDF is actually available
  if (!globalAny.jspdf || !globalAny.jspdf.jsPDF) {
    throw new Error("jsPDF library loaded but not available on window object")
  }
  
  return globalAny.jspdf.jsPDF
}

