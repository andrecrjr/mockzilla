import { type NextRequest, NextResponse } from "next/server"
import type { ExportData, LegacyImportFormat, Mock, Folder } from "@/lib/types"
import { mockzillaAPI } from "@/lib/api-client"

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function isLegacyFormat(data: any): data is LegacyImportFormat {
  return (data.groups !== undefined || data.rules !== undefined) && data.folders === undefined
}

function convertLegacyFormat(data: LegacyImportFormat): ExportData {
  const folderMap = new Map<string, Folder>()
  const convertedMocks: Mock[] = []

  const groupIds = new Set<string>()

  if (data.groups) {
    for (const group of data.groups) {
      groupIds.add(group.id)
    }
  }

  if (data.rules) {
    for (const rule of data.rules) {
      if (rule.group) {
        groupIds.add(rule.group)
      }
    }
  }

  // Convert groups to folders, and create folders for any referenced groups
  if (data.groups) {
    for (const group of data.groups) {
      const folder: Folder = {
        id: group.id,
        name: group.name,
        slug: generateSlug(group.name),
        description: group.description,
        createdAt: new Date().toISOString(),
      }
      folderMap.set(group.id, folder)
    }
  }

  for (const groupId of groupIds) {
    if (!folderMap.has(groupId) && data.groups) {
      const folder: Folder = {
        id: groupId,
        name: `Group ${groupId}`,
        slug: generateSlug(`Group ${groupId}`),
        createdAt: new Date().toISOString(),
      }
      folderMap.set(groupId, folder)
    }
  }

  // Convert rules to mocks
  if (data.rules) {
    for (const rule of data.rules) {
      const folderId = rule.group || generateId()

      // Ensure folder exists for ungrouped mocks
      if (!folderMap.has(folderId)) {
        folderMap.set(folderId, {
          id: folderId,
          name: "Imported Mocks",
          slug: "imported-mocks",
          createdAt: new Date().toISOString(),
        })
      }

      const mock: Mock = {
        id: rule.id,
        name: rule.name,
        path: rule.pattern,
        method: "GET",
        response: rule.body,
        statusCode: rule.statusCode,
        folderId,
        matchType: rule.matchType || "exact",
        bodyType: rule.bodyType || "json",
        enabled: rule.enabled !== false,
        createdAt: new Date().toISOString(),
      }
      convertedMocks.push(mock)
    }
  }

  return {
    folders: Array.from(folderMap.values()),
    mocks: convertedMocks,
    exportedAt: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let exportData: ExportData
    if (isLegacyFormat(body)) {
      exportData = convertLegacyFormat(body)
    } else if (body.folders && body.mocks) {
      exportData = body as ExportData
    } else {
      return NextResponse.json({ error: "Invalid import data format" }, { status: 400 })
    }

    const results = {
      folders: 0,
      mocks: 0,
    }

    // Import folders
    for (const folder of exportData.folders) {
      try {
        await mockzillaAPI.folders.create(folder)
        results.folders++
      } catch (error) {
        console.error("[v0] Failed to import folder:", error)
      }
    }

    // Import mocks
    for (const mock of exportData.mocks) {
      try {
        await mockzillaAPI.mocks.create(mock)
        results.mocks++
      } catch (error) {
        console.error("[v0] Failed to import mock:", error)
      }
    }

    return NextResponse.json({
      success: true,
      imported: results,
    })
  } catch (error: any) {
    console.error("[v0] Import error:", error)
    return NextResponse.json({ error: error.message || "Failed to import data" }, { status: 500 })
  }
}
