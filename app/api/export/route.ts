import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { folders, mockResponses } from "@/lib/db/schema"
import type { ExportData } from "@/lib/types"

export async function GET() {
  try {
    const [allFolders, allMocks] = await Promise.all([
      db.select().from(folders).orderBy(folders.createdAt),
      db.select().from(mockResponses).orderBy(mockResponses.createdAt),
    ])

    const exportData: ExportData = {
      folders: allFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description || undefined,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt?.toISOString(),
      })),
      mocks: allMocks.map((mock) => ({
        id: mock.id,
        name: mock.name,
        path: mock.endpoint,
        method: mock.method,
        response: mock.response,
        statusCode: mock.statusCode,
        folderId: mock.folderId,
        matchType: mock.matchType || "exact",
        bodyType: mock.bodyType || "json",
        enabled: mock.enabled,
        createdAt: mock.createdAt.toISOString(),
        updatedAt: mock.updatedAt?.toISOString(),
      })),
      exportedAt: new Date().toISOString(),
    }

    return NextResponse.json(exportData)
  } catch (error: any) {
    console.error("[API] Error exporting data:", error.message)
    return NextResponse.json({ error: error.message || "Failed to export data" }, { status: 500 })
  }
}
