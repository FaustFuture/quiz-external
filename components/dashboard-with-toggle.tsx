"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { ModulesSection } from "@/components/modules-section"
import { MemberModulesViewWithFilter } from "@/components/member-modules-view-with-filter"
import { ResultsSidebar } from "@/components/results-sidebar"
import { CompanyLogoUpload } from "@/components/company-logo-upload"
import { ThemeToggle } from "@/components/theme-toggle"
import { type Module } from "@/app/actions/modules"
import { type Company } from "@/app/actions/company"

interface DashboardWithToggleProps {
  isAdmin: boolean
  companyId: string
  userId: string
  companyName: string
  companyData: Company | null
  recentResults: any[]
  modules: Module[]
  memberModules: Module[]
  userResults: { [moduleId: string]: any }
}

export function DashboardWithToggle({
  isAdmin,
  companyId,
  userId,
  companyName,
  companyData,
  recentResults,
  modules,
  memberModules,
  userResults
}: DashboardWithToggleProps) {
  const [showMemberView, setShowMemberView] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto px-8 h-16 flex items-center justify-between">
          {isAdmin && !showMemberView ? (
            <CompanyLogoUpload
              companyId={companyId}
              currentLogoUrl={companyData?.logo_url || null}
              companyName={companyName}
            />
          ) : (
            <div className="flex items-center gap-3">
              {companyData?.logo_url ? (
                <img
                  src={companyData.logo_url}
                  alt={`${companyName} logo`}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <img
                  src="/logo.svg"
                  alt={`${companyName} logo`}
                  className="themed-logo w-8 h-8 rounded-lg object-cover"
                />
              )}
              <h1 className="text-xl font-semibold text-foreground">{companyName}</h1>
            </div>
          )}

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">Member View</span>
                <Switch
                  checked={showMemberView}
                  onCheckedChange={setShowMemberView}
                />
              </div>
            )}
            {isAdmin && (
              <span className="text-sm text-foreground">
                {showMemberView ? "" : "Admin"}
              </span>
            )}
          </div>
        </div>
      </header>
      
      {isAdmin && !showMemberView ? (
        <div className="flex min-h-[calc(100vh-4rem)]">
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              <ModulesSection companyId={companyId} initialModules={modules} />
            </div>
          </main>
          <aside className="w-[400px] border-l border-border bg-background p-6">
            <ResultsSidebar results={recentResults} modules={modules} />
          </aside>
        </div>
      ) : (
        <main className="container mx-auto p-8">
          <MemberModulesViewWithFilter 
            companyId={companyId} 
            userId={userId} 
            modules={memberModules}
            userResults={userResults}
          />
        </main>
      )}
    </div>
  )
}
