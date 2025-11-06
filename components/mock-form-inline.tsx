"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import type { HttpMethod, CreateMockRequest, Folder } from "@/lib/types"

interface MockFormInlineProps {
  folder: Folder
  onSuccess: () => void
  onError: (message: string) => void
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

const STATUS_CODES = [
  { value: "200", label: "200 - OK" },
  { value: "201", label: "201 - Created" },
  { value: "202", label: "202 - Accepted" },
  { value: "204", label: "204 - No Content" },
  { value: "400", label: "400 - Bad Request" },
  { value: "401", label: "401 - Unauthorized" },
  { value: "403", label: "403 - Forbidden" },
  { value: "404", label: "404 - Not Found" },
  { value: "405", label: "405 - Method Not Allowed" },
  { value: "409", label: "409 - Conflict" },
  { value: "422", label: "422 - Unprocessable Entity" },
  { value: "500", label: "500 - Internal Server Error" },
  { value: "502", label: "502 - Bad Gateway" },
  { value: "503", label: "503 - Service Unavailable" },
]

export function MockFormInline({ folder, onSuccess, onError }: MockFormInlineProps) {
  const [name, setName] = useState("")
  const [path, setPath] = useState("/")
  const [method, setMethod] = useState<HttpMethod>("GET")
  const [jsonData, setJsonData] = useState("")
  const [statusCode, setStatusCode] = useState("200")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const previewUrl = path.startsWith("/") && path.length > 1 ? `${origin}/api/mock/${folder.slug}${path}` : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      JSON.parse(jsonData)
    } catch {
      onError("Please provide valid JSON data")
      setIsSubmitting(false)
      return
    }

    if (!path.startsWith("/")) {
      onError("Path must start with /")
      setIsSubmitting(false)
      return
    }

    try {
      const payload: CreateMockRequest = {
        name,
        path,
        method,
        response: jsonData,
        statusCode: Number.parseInt(statusCode),
        folderId: folder.id,
      }

      const response = await fetch("/api/mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      setName("")
      setPath("")
      setMethod("GET")
      setJsonData("")
      setStatusCode("200")

      onSuccess()
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to create mock")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-border bg-card p-6">
      <h2 className="mb-6 text-2xl font-semibold text-card-foreground">Create New Mock</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Mock Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., User List API"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="font-mono"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="method" className="text-sm font-medium">
              HTTP Method
            </Label>
            <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
              <SelectTrigger id="method" className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="font-mono">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statusCode" className="text-sm font-medium">
              Status Code
            </Label>
            <Select value={statusCode} onValueChange={setStatusCode}>
              <SelectTrigger id="statusCode" className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CODES.map((code) => (
                  <SelectItem key={code.value} value={code.value}>
                    {code.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="path" className="text-sm font-medium">
            Endpoint Path
          </Label>
          <Input
            id="path"
            placeholder="/users"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            required
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">Must start with /. Example: /api/users</p>
          {previewUrl && (
            <p className="text-xs text-muted-foreground font-mono">
              Preview: <span className="text-foreground">{previewUrl}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="json" className="text-sm font-medium">
            JSON Response
          </Label>
          <Textarea
            id="json"
            placeholder='{"users": [{"id": 1, "name": "John"}]}'
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            required
            rows={10}
            className="font-mono text-sm max-h-[40vh] overflow-auto"
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          <Plus className="mr-2 h-4 w-4" />
          {isSubmitting ? "Creating..." : "Create Mock Endpoint"}
        </Button>
      </form>
    </Card>
  )
}
