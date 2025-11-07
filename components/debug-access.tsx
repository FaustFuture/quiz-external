"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"

interface DebugAccessProps {
  access: any
  company: any
  user: any
}

export function DebugAccess({ access, company, user }: DebugAccessProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (process.env.NODE_ENV === "production") {
    return null // Don't show debug info in production
  }

  return (
    <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-start gap-2 p-0 h-auto"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="font-medium text-yellow-800 dark:text-yellow-200">
          🔧 Debug: Access Data (Development Only)
        </span>
      </Button>
      
      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Access Data:</h4>
            <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border overflow-x-auto">
              <code>{JSON.stringify(access, null, 2)}</code>
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Company Data:</h4>
            <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border overflow-x-auto">
              <code>{JSON.stringify(company, null, 2)}</code>
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">User Data:</h4>
            <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border overflow-x-auto">
              <code>{JSON.stringify(user, null, 2)}</code>
            </pre>
          </div>
          
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <p><strong>Tip:</strong> Use this data to configure admin permissions in the <code>checkUserIsAdmin</code> function.</p>
            <p>Look for fields like <code>access.plan</code>, <code>access.permissions</code>, or <code>access.role</code>.</p>
          </div>
        </div>
      )}
    </div>
  )
}
