"use client"

import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeSwitcher } from "@/components/theme-switcher"
import useSWR, { mutate } from "swr"
import type { Mock, Folder, HttpMethod } from "@/lib/types"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { MockCard } from "@/components/mock-card"
import { copyToClipboard } from "@/lib/utils"
import { MockFormInline } from "@/components/mock-form-inline"
import { PaginationControls } from "@/components/pagination-controls"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FolderPage() {
  const params = useParams()
  const slug = params.slug as string
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const { data: folders = [] } = useSWR<Folder[]>("/api/folders?all=true", fetcher)
  const folder = folders.find((f) => f.slug === slug)

  const { data, isLoading: mocksLoading } = useSWR<{ data: Mock[], meta: { total: number, page: number, limit: number, totalPages: number } }>(
    folder ? `/api/mocks?folderId=${folder.id}&page=${page}&limit=${limit}` : null,
    fetcher,
  )

  const mocks = data?.data || []
  const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 }

  const handleMockSuccess = () => {
    toast.success("Mock Created", {
      description: "Your mock endpoint has been created successfully",
    })
    mutate(`/api/mocks?folderId=${folder?.id}&page=${page}&limit=${limit}`)
  }

  const handleError = (message: string) => {
    toast.error("Error", {
      description: message,
    })
  }

  const handleDeleteMock = async (id: string) => {
    try {
      await fetch(`/api/mocks?id=${id}`, { method: "DELETE" })
      toast.success("Mock Deleted", {
        description: "Mock endpoint has been removed",
      })
      mutate(`/api/mocks?folderId=${folder?.id}&page=${page}&limit=${limit}`)
    } catch {
      toast.error("Error", {
        description: "Failed to delete mock",
      })
    }
  }

  const handleUpdateMock = async (
    id: string,
    data: { name: string; path: string; method: HttpMethod; response: string; statusCode: number },
  ) => {
    try {
      const response = await fetch(`/api/mocks?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Mock Updated", {
        description: "Mock endpoint has been updated successfully",
      })
      mutate(`/api/mocks?folderId=${folder?.id}&page=${page}&limit=${limit}`)
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to update mock",
      })
      throw error
    }
  }

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      toast.success("Copied", {
        description: "URL copied to clipboard",
      })
    } else {
      toast.error("Copy failed", {
        description: "Could not copy to clipboard"
      })
    }
  }

  if (!folder) {
    return (
      <div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-12">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Folder not found</p>
              <Button asChild className="mt-4">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Folders
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Folders
            </Link>
          </Button>
          <ThemeSwitcher />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">{folder.name}</h1>
              <p className="mt-1 text-muted-foreground">/{folder.slug}</p>
            </div>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary mockzilla-border">
              {meta.total} {meta.total === 1 ? "mock" : "mocks"}
            </span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Create Mock Form */}
          <div>
            <MockFormInline folder={folder} onSuccess={handleMockSuccess} onError={handleError} />
          </div>

          {/* Right Column - Mocks List */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Mock Endpoints</h2>

            {mocksLoading ? (
              <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
                <p className="text-center text-muted-foreground">Loading...</p>
              </Card>
            ) : mocks.length === 0 ? (
              <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-12">
                <div className="text-center">
                  <Plus className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium text-muted-foreground">No mocks yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Create your first mock endpoint</p>
                </div>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {mocks.map((mock) => (
                    <MockCard
                      key={mock.id}
                      mock={mock}
                      folder={folder}
                      onDelete={handleDeleteMock}
                      onUpdate={handleUpdateMock}
                      onCopy={handleCopy}
                    />
                  ))}
                </div>
                <PaginationControls
                  currentPage={page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                  limit={limit}
                  onLimitChange={setLimit}
                  totalItems={meta.total}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
