"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Copy, Trash2, ExternalLink, Pencil } from "lucide-react"
import type { Mock, Folder, HttpMethod } from "@/lib/types"

interface MockCardProps {
  mock: Mock
  folder?: Folder
  onDelete: (id: string) => void
  onUpdate: (
    id: string,
    data: { name: string; path: string; method: HttpMethod; response: string; statusCode: number },
  ) => Promise<void>
  onCopy: (text: string) => void

}

export function MockCard({ mock, folder, onDelete, onUpdate, onCopy }: MockCardProps) {
  const getMockUrl = (folderSlug: string, path: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/mock/${folderSlug}${path}`
    }
    return `/api/mock/${folderSlug}${path}`
  }

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) {
      return "bg-green-500/10 text-green-600 dark:text-green-400"
    }
    if (code >= 400 && code < 500) {
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
    }
    return "bg-red-500/10 text-red-600 dark:text-red-400"
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      case "POST":
        return "bg-green-500/10 text-green-600 dark:text-green-400"
      case "PUT":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400"
      case "PATCH":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400"
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400"
    }
  }

  const mockUrl = getMockUrl(folder?.slug || "", mock.path)

  return (
    <Card className="border-border bg-card p-6 transition-colors hover:bg-accent/5">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground">{mock.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getMethodColor(mock.method)}`}>
                {mock.method}
              </span>
              <code className="inline-block rounded bg-muted px-2 py-1 text-sm text-muted-foreground">{mock.path}</code>
              <span
                className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusCodeColor(mock.statusCode)}`}
              >
                {mock.statusCode}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/folder/${folder?.slug}/mock/${mock.id}`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(mock.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Mock URL</Label>
          <div className="flex gap-2">
            <Input value={mockUrl} readOnly className="flex-1 font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={() => onCopy(mockUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.open(mockUrl, "_blank")}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
