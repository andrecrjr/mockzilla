"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import useSWR, { mutate } from "swr"
import type { Mock, Folder } from "@/lib/types"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { MockEditor } from "@/components/mock-editor"
import { validateSchema } from "@/lib/schema-generator"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function EditMockPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const mockId = params.mockId as string

  const { data: folder, isLoading: isFolderLoading } = useSWR<Folder>(slug ? `/api/folders?slug=${slug}` : null, fetcher)
  
  const { data: mock, isLoading: isMockLoading } = useSWR<Mock>(
    mockId ? `/api/mocks?id=${mockId}` : null,
    fetcher
  )

  const [isLoading, setIsLoading] = useState(false)

  const handleUpdate = async (values: {
    name: string
    path: string
    method: string
    statusCode: string
    response: string
    jsonSchema?: string
    useDynamicResponse?: boolean
  }) => {
    if (!mock || !folder) return
    setIsLoading(true)
    try {
      if (!values.path.startsWith("/")) {
        toast.error("Error", { description: "Path must start with /" })
        setIsLoading(false)
        return
      }
      try {
        if (values.useDynamicResponse) {
          const validation = validateSchema(values.jsonSchema || "")
          if (!validation.valid) {
            throw new Error(validation.error || "Invalid JSON Schema")
          }
          JSON.parse(values.jsonSchema || "")
        } else {
            JSON.parse(values.response)
        }
      } catch {
        toast.error("Error", { description: "Please provide valid JSON" })
        setIsLoading(false)
        return
      }
      const res = await fetch(`/api/mocks?id=${mock.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          path: values.path,
          method: values.method,
          response: values.response,
          statusCode: Number.parseInt(values.statusCode),
          jsonSchema: values.jsonSchema,
          useDynamicResponse: values.useDynamicResponse,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }
      toast.success("Mock Updated", { description: "Mock endpoint has been updated successfully" })
      mutate(`/api/mocks?folderId=${folder.id}`)
      router.push(`/folder/${slug}`)
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to update mock" })
    } finally {
      setIsLoading(false)
    }
  }

  if (!folder || !mock) {
    return (
      <div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
           <div className="flex items-center justify-center h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
      <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href={`/folder/${slug}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {folder?.name}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Edit Mock</h1>
          </div>
          <div className="flex items-center gap-2">
             <ThemeSwitcher />
          </div>
        </div>

        <div className="grid gap-8">
          <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-y-auto">
            <MockEditor
              mode="edit"
              initial={mock ? {
                name: mock.name,
                path: mock.path,
                method: mock.method,
                statusCode: mock.statusCode.toString(),
                response: mock.response,
                jsonSchema: mock.jsonSchema || "",
                useDynamicResponse: Boolean(mock.useDynamicResponse),
              } : undefined}
              submitLabel="Save Changes"
              previewSlug={slug as string}
              isSubmitting={isLoading}
              onSubmit={async (values) => {
                await handleUpdate(values)
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
