"use client"

import type React from "react"

import { useState } from "react"
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
import { Pencil } from "lucide-react"
import type { Mock, HttpMethod } from "@/lib/types"

interface EditMockDialogProps {
  mock: Mock
  onUpdate: (
    id: string,
    data: { name: string; path: string; method: HttpMethod; response: string; statusCode: number },
  ) => Promise<void>
}

export function EditMockDialog({ mock, onUpdate }: EditMockDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(mock.name)
  const [path, setPath] = useState(mock.path)
  const [method, setMethod] = useState<HttpMethod>(mock.method)
  const [response, setResponse] = useState(mock.response)
  const [statusCode, setStatusCode] = useState(mock.statusCode.toString())
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onUpdate(mock.id, {
        name,
        path,
        method,
        response,
        statusCode: Number.parseInt(statusCode),
      })
      setOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Mock</DialogTitle>
            <DialogDescription>Update the mock endpoint configuration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Mock Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Get Users"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-method">HTTP Method</Label>
                <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
                  <SelectTrigger id="edit-method">
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
                <Label htmlFor="edit-status">Status Code</Label>
                <Select value={statusCode} onValueChange={setStatusCode}>
                  <SelectTrigger id="edit-status">
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
              <Label htmlFor="edit-path">Endpoint Path</Label>
              <Input
                id="edit-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/users"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-response">JSON Response</Label>
              <Textarea
                id="edit-response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Mock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
