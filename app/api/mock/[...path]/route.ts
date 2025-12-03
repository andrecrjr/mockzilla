import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { folders, mockResponses } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

async function handleRequest(request: NextRequest, params: { path: string[] }) {
  const pathSegments = params.path
  const method = request.method

  // Expected format: /mock/{folderSlug}/{mockPath}
  if (pathSegments.length < 2) {
    return NextResponse.json({ error: "Invalid mock URL format" }, { status: 400 })
  }

  const folderSlug = pathSegments[0]
  const mockPath = "/" + pathSegments.slice(1).join("/")

  try {
    // Find the folder by slug
    const [folder] = await db.select().from(folders).where(eq(folders.slug, folderSlug)).limit(1)

    if (!folder) {
      return NextResponse.json({ error: "Folder not found", folderSlug }, { status: 404 })
    }

    // Find matching mock by folderId, endpoint, and method
    const [mock] = await db
      .select()
      .from(mockResponses)
      .where(
        and(
          eq(mockResponses.folderId, folder.id),
          eq(mockResponses.endpoint, mockPath),
          eq(mockResponses.method, method as any)
        )
      )
      .limit(1)

    if (!mock) {
      return NextResponse.json(
        { error: "Mock endpoint not found", folder: folderSlug, path: mockPath, method },
        { status: 404 }
      )
    }
    // Check if we should echo the request body
    if (mock.echoRequestBody) {
      const contentType = request.headers.get("content-type") || "text/plain"
      
      if (contentType.includes("application/json")) {
        try {
          const body = await request.json()
          return NextResponse.json(body, { status: mock.statusCode })
        } catch {
          // If JSON parsing fails, fall back to text
          const body = await request.text()
          return new NextResponse(body, {
            status: mock.statusCode,
            headers: { "Content-Type": contentType },
          })
        }
      } else {
        const body = await request.text()
        return new NextResponse(body, {
          status: mock.statusCode,
          headers: { "Content-Type": contentType },
        })
      }
    }

    // Check if this mock uses dynamic schema-based responses
    if (mock.useDynamicResponse && mock.jsonSchema) {
      try {
        // Import the schema generator utility
        const { generateFromSchema } = await import("@/lib/schema-generator")
        
        // Generate fresh JSON from the schema on each request
        const generatedJson = generateFromSchema(JSON.parse(mock.jsonSchema))
        
        return NextResponse.json(JSON.parse(generatedJson), { status: mock.statusCode })
      } catch (error) {
        console.error("[API] Error generating from schema:", error)
        // Fallback to static response if generation fails
        try {
          return NextResponse.json(JSON.parse(mock.response), { status: mock.statusCode })
        } catch {
          return new NextResponse(mock.response, {
            status: mock.statusCode,
            headers: { "Content-Type": "application/json" },
          })
        }
      }
    }

    // Return the mock response with the configured status code
    const contentType = mock.bodyType === "json" ? "application/json" : "text/plain"

    // Try to parse as JSON if bodyType is json
    const responseBody = mock.response
    if (mock.bodyType === "json") {
      try {
        return NextResponse.json(JSON.parse(mock.response), { status: mock.statusCode })
      } catch {
        // If parsing fails, return as text
        return new NextResponse(mock.response, {
          status: mock.statusCode,
          headers: { "Content-Type": contentType },
        })
      }
    }

    return new NextResponse(responseBody, {
      status: mock.statusCode,
      headers: { "Content-Type": contentType },
    })
  } catch (error: any) {
    console.error("[API] Error serving mock:", error.message)
    return NextResponse.json({ error: "Failed to serve mock response" }, { status: 500 })
  }
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
