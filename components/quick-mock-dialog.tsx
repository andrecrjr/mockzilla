"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap } from "lucide-react"
import type { HttpMethod, CreateMockRequest, Folder } from "@/lib/types"
import { toast } from "sonner"
import { mutate } from "swr"

interface QuickMockDialogProps {
  folders: Folder[]
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH"]

const STATUS_CODES = [
  { value: "200", label: "200 - OK" },
  { value: "201", label: "201 - Created" },
  { value: "204", label: "204 - No Content" },
  { value: "400", label: "400 - Bad Request" },
  { value: "401", label: "401 - Unauthorized" },
  { value: "403", label: "403 - Forbidden" },
  { value: "404", label: "404 - Not Found" },
  { value: "500", label: "500 - Internal Server Error" },
  { value: "502", label: "502 - Bad Gateway" },
  { value: "503", label: "503 - Service Unavailable" },
]

export function QuickMockDialog({ folders }: QuickMockDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [method, setMethod] = useState<HttpMethod>("GET")
  const [jsonData, setJsonData] = useState("")
  const [statusCode, setStatusCode] = useState("200")
  const [folderId, setFolderId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!folderId) {
      toast.error("Error", {
        description: "Please select a folder",
      })
      setIsSubmitting(false)
      return
    }

    try {
      JSON.parse(jsonData)
    } catch {
      toast.error("Error", {
        description: "Please provide valid JSON data",
      })
      setIsSubmitting(false)
      return
    }

    if (!path.startsWith("/")) {
      toast.error("Error", {
        description: "Path must start with /",
      })
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
        folderId,
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

      toast.success("Mock Created", {
        description: "Your mock endpoint has been created successfully",
      })

      const selectedFolder = folders.find((f) => f.id === folderId)
      if (selectedFolder) {
        mutate(`/api/mocks?folderId=${folderId}`)
        router.push(`/folder/${selectedFolder.slug}`)
      }

      setOpen(false)
      setName("")
      setPath("")
      setMethod("GET")
      setJsonData("")
      setStatusCode("200")
      setFolderId("")
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to create mock",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (folders.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Zap className="mr-2 h-4 w-4" />
          Quick Mock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Quick Create Mock</DialogTitle>
            <DialogDescription>Create a new mock endpoint and navigate to its folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-folder">Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger id="quick-folder">
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-name">Mock Name</Label>
              <Input
                id="quick-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., User List API"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quick-method">HTTP Method</Label>
                <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
                  <SelectTrigger id="quick-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-status">Status Code</Label>
                <Select value={statusCode} onValueChange={setStatusCode}>
                  <SelectTrigger id="quick-status">
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
              <Label htmlFor="quick-path">Endpoint Path</Label>
              <Input
                id="quick-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/users"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-json">JSON Response</Label>
              <Textarea
                id="quick-json"
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder='{"message": "Hello World"}'
                className="font-mono text-sm"
                rows={8}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create & Go to Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
