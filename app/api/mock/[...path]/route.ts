import { type NextRequest, NextResponse } from "next/server"
import { mockzillaAPI } from "@/lib/api-client"

// Helper to get mocks and folders directly via the API client
async function getMocks() {
  try {
    return await mockzillaAPI.mocks.list()
  } catch {
    return []
  }
}

async function getFolders() {
  try {
    return await mockzillaAPI.folders.list()
  } catch {
    return []
  }
}

async function handleRequest(request: NextRequest, params: { path: string[] }) {
  const pathSegments = params.path
  const method = request.method

  // Expected format: /mock/{folderSlug}/{mockPath}
  if (pathSegments.length < 2) {
    return NextResponse.json({ error: "Invalid mock URL format" }, { status: 400 })
  }

  const folderSlug = pathSegments[0]
  const mockPath = "/" + pathSegments.slice(1).join("/")

  // Get all folders and mocks
  const [allFolders, allMocks] = await Promise.all([getFolders(), getMocks()])

  // Find the folder by slug
  const folder = allFolders.find((f: any) => f.slug === folderSlug)
  if (!folder) {
    return NextResponse.json({ error: "Folder not found", folderSlug }, { status: 404 })
  }

  // Find matching mock by folderId, path, and method
  const mock = allMocks.find((m: any) => m.folderId === folder.id && m.path === mockPath && m.method === method)

  if (!mock) {
    return NextResponse.json(
      { error: "Mock endpoint not found", folder: folderSlug, path: mockPath, method },
      { status: 404 },
    )
  }

  // Return the mock response with the configured status code
  return NextResponse.json(JSON.parse(mock.response), { status: mock.statusCode || 200 })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params)
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params)
}

export async function OPTIONS(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Respond to preflight with 204; actual CORS headers are set by middleware
  return new NextResponse(null, { status: 204 })
}
