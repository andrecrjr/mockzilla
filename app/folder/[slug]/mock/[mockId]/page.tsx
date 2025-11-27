"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import useSWR, { mutate } from "swr"
import type { Mock, HttpMethod, Folder } from "@/lib/types"
import { ThemeSwitcher } from "@/components/theme-switcher"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function EditMockPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const mockId = params.mockId as string

  const { data: folders = [] } = useSWR<Folder[]>("/api/folders", fetcher)
  const folder = folders.find((f) => f.slug === slug)

  const { data: mocks = [] } = useSWR<Mock[]>(
    folder ? `/api/mocks?folderId=${folder.id}` : null,
    fetcher
  )

  const mock = mocks.find((m) => m.id === mockId)

  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [method, setMethod] = useState<HttpMethod>("GET")
  const [response, setResponse] = useState("")
  const [statusCode, setStatusCode] = useState("200")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (mock && !isInitialized) {
      setName(mock.name)
      setPath(mock.path)
      setMethod(mock.method)
      setResponse(mock.response)
      setStatusCode(mock.statusCode.toString())
      setIsInitialized(true)
    }
  }, [mock, isInitialized])

  const handleUpdate = async () => {
    if (!mock || !folder) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/mocks?id=${mock.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          path,
          method,
          response,
          statusCode: Number.parseInt(statusCode),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast.success("Mock Updated", {
        description: "Mock endpoint has been updated successfully",
      })
      mutate(`/api/mocks?folderId=${folder.id}`)
      router.push(`/folder/${slug}`)
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to update mock",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!folder || (!mock && mocks.length > 0)) {
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
             <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 h-[calc(100vh-12rem)]">
          {/* Left Column - Configuration */}
          <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-y-auto">
            <h2 className="mb-6 text-xl font-semibold text-foreground">Configuration</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Mock Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Get Users"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method">HTTP Method</Label>
                  <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="HEAD">HEAD</SelectItem>
                      <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status Code</Label>
                  <Select value={statusCode} onValueChange={setStatusCode}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="200">200 OK</SelectItem>
                      <SelectItem value="201">201 Created</SelectItem>
                      <SelectItem value="202">202 Accepted</SelectItem>
                      <SelectItem value="204">204 No Content</SelectItem>
                      <SelectItem value="400">400 Bad Request</SelectItem>
                      <SelectItem value="401">401 Unauthorized</SelectItem>
                      <SelectItem value="403">403 Forbidden</SelectItem>
                      <SelectItem value="404">404 Not Found</SelectItem>
                      <SelectItem value="405">405 Method Not Allowed</SelectItem>
                      <SelectItem value="409">409 Conflict</SelectItem>
                      <SelectItem value="422">422 Unprocessable Entity</SelectItem>
                      <SelectItem value="500">500 Internal Server Error</SelectItem>
                      <SelectItem value="502">502 Bad Gateway</SelectItem>
                      <SelectItem value="503">503 Service Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="path">Endpoint Path</Label>
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/users"
                  required
                />
                {typeof window !== "undefined" && path.startsWith("/") && path.length > 1 && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Preview: <span className="text-foreground">{`${window.location.origin}/api/mock/${slug}${path}`}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Right Column - JSON Response */}
          <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 flex flex-col h-full">
            <h2 className="mb-4 text-xl font-semibold text-foreground">JSON Response</h2>
            <div className="flex-1">
              <Textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder='{"message": "Hello World"}'
                className="font-mono text-sm h-full resize-none"
                required
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
