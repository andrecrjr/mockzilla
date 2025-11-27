import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { folders } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import type { CreateFolderRequest, UpdateFolderRequest } from "@/lib/types"

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const all = searchParams.get("all") === "true"
    
    const slug = searchParams.get("slug")
    
    if (slug) {
      const [folder] = await db.select().from(folders).where(eq(folders.slug, slug))
      
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 })
      }

      return NextResponse.json({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description || undefined,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt?.toISOString(),
      })
    }

    if (all) {
      const allFolders = await db.select().from(folders).orderBy(folders.createdAt)
      return NextResponse.json(allFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description || undefined,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt?.toISOString(),
      })))
    }

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(folders)
    const total = Number(totalResult.count)
    const totalPages = Math.ceil(total / limit)

    const paginatedFolders = await db
      .select()
      .from(folders)
      .orderBy(folders.createdAt)
      .limit(limit)
      .offset(offset)
    
    // Map database fields to API format
    const formattedFolders = paginatedFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      description: folder.description || undefined,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt?.toISOString(),
    }))
    
    return NextResponse.json({
      data: formattedFolders,
      meta: {
        total,
        page,
        limit,
        totalPages,
      }
    })
  } catch (error: any) {
    console.error("[API] Error fetching folders:", error.message)
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateFolderRequest = await request.json()
    
    const slug = generateSlug(body.name)
    
    const [newFolder] = await db
      .insert(folders)
      .values({
        name: body.name,
        slug,
        description: body.description || null,
      })
      .returning()
    
    return NextResponse.json(
      {
        id: newFolder.id,
        name: newFolder.name,
        slug: newFolder.slug,
        description: newFolder.description || undefined,
        createdAt: newFolder.createdAt.toISOString(),
        updatedAt: newFolder.updatedAt?.toISOString(),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[API] Error creating folder:", error.message)
    return NextResponse.json({ error: error.message || "Failed to create folder" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 })
    }

    const body: UpdateFolderRequest = await request.json()
    const slug = generateSlug(body.name)
    
    const [updatedFolder] = await db
      .update(folders)
      .set({
        name: body.name,
        slug,
        description: body.description || null,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, id))
      .returning()
    
    if (!updatedFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }
    
    return NextResponse.json({
      id: updatedFolder.id,
      name: updatedFolder.name,
      slug: updatedFolder.slug,
      description: updatedFolder.description || undefined,
      createdAt: updatedFolder.createdAt.toISOString(),
      updatedAt: updatedFolder.updatedAt?.toISOString(),
    })
  } catch (error: any) {
    console.error("[API] Error updating folder:", error.message)
    return NextResponse.json({ error: error.message || "Failed to update folder" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 })
    }

    await db.delete(folders).where(eq(folders.id, id))
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Error deleting folder:", error.message)
    return NextResponse.json({ error: error.message || "Failed to delete folder" }, { status: 500 })
  }
}
