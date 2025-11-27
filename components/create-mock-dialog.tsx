"use client"

import type React from "react"
import { useRef, useState } from "react"
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
import { Plus, Zap } from "lucide-react"
import type { HttpMethod, CreateMockRequest, Folder } from "@/lib/types"
import { toast } from "sonner"
import { mutate } from "swr"

interface CreateMockDialogProps {
  folders: Folder[]
  defaultFolderId?: string
  trigger?: React.ReactNode
  onSuccess?: () => void
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

export function CreateMockDialog({ folders, defaultFolderId, trigger, onSuccess }: CreateMockDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [path, setPath] = useState("/")
  const [method, setMethod] = useState<HttpMethod>("GET")
  const [statusCode, setStatusCode] = useState("200")
  const [folderId, setFolderId] = useState(defaultFolderId || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Use ref for JSON data to avoid re-renders on every keystroke
  const jsonRef = useRef<HTMLTextAreaElement>(null)

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const selectedFolder = folders.find((f) => f.id === (defaultFolderId || folderId))
  const previewUrl = selectedFolder && path.startsWith("/") && path.length > 1
    ? `${origin}/api/mock/${selectedFolder.slug}${path}`
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const targetFolderId = defaultFolderId || folderId
    const jsonData = jsonRef.current?.value || ""

    if (!targetFolderId) {
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
        folderId: targetFolderId,
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

      if (onSuccess) {
        onSuccess()
      } else {
        const selectedFolder = folders.find((f) => f.id === targetFolderId)
        if (selectedFolder) {
           mutate(`/api/mocks?folderId=${targetFolderId}`)
           router.push(`/folder/${selectedFolder.slug}`)
        }
      }

      setOpen(false)
      setName("")
      setPath("/")
      setMethod("GET")
      if (jsonRef.current) jsonRef.current.value = ""
      setStatusCode("200")
      if (!defaultFolderId) setFolderId("")
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to create mock",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Mock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="min-w-[800px] max-w-6xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{defaultFolderId ? "Create New Mock" : "Quick Create Mock"}</DialogTitle>
            <DialogDescription>
              {defaultFolderId 
                ? "Create a new mock endpoint in this folder." 
                : "Create a new mock endpoint and navigate to its folder."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 lg:grid-cols-5">
            {/* Left Column - Configuration */}
            <div className="space-y-4 col-span-2">
              {!defaultFolderId && (
                <div className="space-y-2">
                  <Label htmlFor="create-folder">Folder</Label>
                  <Select value={folderId} onValueChange={setFolderId}>
                    <SelectTrigger id="create-folder">
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
              )}

              <div className="space-y-2">
                <Label htmlFor="create-name">Mock Name</Label>
                <Input
                  id="create-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., User List API"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-method">HTTP Method</Label>
                  <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
                    <SelectTrigger id="create-method">
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
                  <Label htmlFor="create-status">Status Code</Label>
                  <Select value={statusCode} onValueChange={setStatusCode}>
                    <SelectTrigger id="create-status">
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
                <Label htmlFor="create-path">Endpoint Path</Label>
                <Input
                  id="create-path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/users"
                  required
                />
                {previewUrl && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Preview: <span className="text-foreground">{previewUrl}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - JSON Response */}
            <div className="space-y-2 flex flex-col col-span-3">
              <Label htmlFor="create-json">JSON Response</Label>
              <Textarea
                id="create-json"
                ref={jsonRef}
                placeholder='{"message": "Hello World"}'
                className="font-mono text-sm flex-1 min-h-[300px]"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Mock Endpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
