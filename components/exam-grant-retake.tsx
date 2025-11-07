"use client"

import { useState } from "react"
import { Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { GrantRetakeDialog } from "@/components/grant-retake-dialog"

interface ExamGrantRetakeProps {
  moduleId: string
  companyId: string
  moduleType: 'module' | 'exam'
}

export function ExamGrantRetake({ moduleId, companyId, moduleType }: ExamGrantRetakeProps) {
  const router = useRouter()

  if (moduleType !== 'exam') return null

  return <GrantRetakeDialog moduleId={moduleId} companyId={companyId} />
}


