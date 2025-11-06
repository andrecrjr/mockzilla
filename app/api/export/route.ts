import { NextResponse } from "next/server"
import type { ExportData } from "@/lib/types"
import { mockzillaAPI } from "@/lib/api-client"

export async function GET() {
  try {
    const [folders, mocks] = await Promise.all([mockzillaAPI.folders.list(), mockzillaAPI.mocks.list()])

    const exportData: ExportData = {
      folders,
      mocks,
      exportedAt: new Date().toISOString(),
    }

    return NextResponse.json(exportData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to export data" }, { status: 500 })
  }
}
