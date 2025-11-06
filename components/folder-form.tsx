"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderPlus } from "lucide-react"

interface FolderFormProps {
  onSuccess: () => void
  onError: (message: string) => void
}

export function FolderForm({ onSuccess, onError }: FolderFormProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      setName("")
      onSuccess()
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to create folder")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="folder-name" className="sr-only">
          Folder Name
        </Label>
        <Input
          id="folder-name"
          placeholder="e.g., User APIs, Products, Orders"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="font-mono"
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        <FolderPlus className="mr-2 h-4 w-4" />
        {isSubmitting ? "Creating..." : "Create Folder"}
      </Button>
    </form>
  )
}
