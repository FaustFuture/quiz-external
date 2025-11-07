import { NextRequest, NextResponse } from "next/server"
import { getResultWithAnswers } from "@/app/actions/results"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params
    
    const result = await getResultWithAnswers(resultId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error fetching detailed result:", error)
    return NextResponse.json(
      { error: "Failed to fetch detailed result" },
      { status: 500 }
    )
  }
}
