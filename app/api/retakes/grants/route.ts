import { NextResponse } from "next/server"
import { getUserRetakeGrants } from "@/app/actions/users"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || ""
    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }
    const res = await getUserRetakeGrants(userId)
    return NextResponse.json(res, { status: res.success ? 200 : 500 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "Failed to load retake grants" }, { status: 500 })
  }
}


