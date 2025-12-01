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
import { MockEditor } from "@/components/mock-editor"
import { Plus } from "lucide-react"
import type { CreateMockRequest, Folder } from "@/lib/types"
import { toast } from "sonner"
import { mutate } from "swr"

interface CreateMockDialogProps {
  folders: Folder[]
  defaultFolderId?: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

 

export function CreateMockDialog({ folders, defaultFolderId, trigger, onSuccess }: CreateMockDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (values: {
    name: string
    path: string
    method: string
    statusCode: string
    folderId?: string
    response: string
    jsonSchema?: string
    useDynamicResponse?: boolean
  }) => {
    try {
      setIsSubmitting(true)
      const payload: CreateMockRequest = {
        name: values.name,
        path: values.path,
        method: values.method as CreateMockRequest["method"],
        response: values.response,
        statusCode: Number.parseInt(values.statusCode),
        folderId: values.folderId || defaultFolderId || "",
        jsonSchema: values.jsonSchema,
        useDynamicResponse: values.useDynamicResponse,
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
      toast.success("Mock Created", { description: "Your mock endpoint has been created successfully" })
      if (onSuccess) {
        onSuccess()
      } else {
        const selectedFolder = folders.find((f) => f.id === (values.folderId || defaultFolderId))
        if (selectedFolder) {
          mutate(`/api/mocks?folderId=${selectedFolder.id}`)
          router.push(`/folder/${selectedFolder.slug}`)
        }
      }
      setOpen(false)
    } catch (error) {
      toast.error("Error", { description: error instanceof Error ? error.message : "Failed to create mock" })
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
      <DialogContent className="min-w-[80%] max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{defaultFolderId ? "Create New Mock" : "Quick Create Mock"}</DialogTitle>
          <DialogDescription>
            {defaultFolderId 
              ? "Create a new mock endpoint in this folder." 
              : "Create a new mock endpoint and navigate to its folder."}
          </DialogDescription>
        </DialogHeader>
        <MockEditor
          mode="create"
          folders={folders}
          defaultFolderId={defaultFolderId}
          showFolderSelect={!defaultFolderId}
          onCancel={() => setOpen(false)}
          isSubmitting={isSubmitting}
          onSubmit={handleCreate}
        />
      </DialogContent>
    </Dialog>
  )
}
