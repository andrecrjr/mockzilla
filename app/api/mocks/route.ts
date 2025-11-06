import { type NextRequest, NextResponse } from "next/server"
import { mockzillaAPI } from "@/lib/api-client"
import type { CreateMockRequest, UpdateMockRequest } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    const folderId = request.nextUrl.searchParams.get("folderId")
    const mocks = await mockzillaAPI.mocks.list(folderId || undefined)
    return NextResponse.json(mocks)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch mocks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMockRequest = await request.json()
    const mock = await mockzillaAPI.mocks.create(body)
    return NextResponse.json(mock, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create mock" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Mock ID is required" }, { status: 400 })
    }

    const body: UpdateMockRequest = await request.json()
    const mock = await mockzillaAPI.mocks.update(id, body)
    return NextResponse.json(mock)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update mock" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Mock ID is required" }, { status: 400 })
    }

    await mockzillaAPI.mocks.delete(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete mock" }, { status: 500 })
  }
}
