import { type NextRequest, NextResponse } from "next/server"
import { mockzillaAPI } from "@/lib/api-client"
import type { CreateFolderRequest, UpdateFolderRequest } from "@/lib/types"

export async function GET() {
  try {
    const folders = await mockzillaAPI.folders.list()
    return NextResponse.json(Array.isArray(folders) ? folders : [])
  } catch (error: any) {
    console.log("[v0] Error fetching folders:", error.message)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateFolderRequest = await request.json()
    const folder = await mockzillaAPI.folders.create(body)
    return NextResponse.json(folder, { status: 201 })
  } catch (error: any) {
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
    const folder = await mockzillaAPI.folders.update(id, body)
    return NextResponse.json(folder)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update folder" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 })
    }

    await mockzillaAPI.folders.delete(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete folder" }, { status: 500 })
  }
}
