"use client"

import type React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FolderForm } from "@/components/folder-form"
import { QuickMockDialog } from "@/components/quick-mock-dialog"
import { ThemeSwitcher } from "@/components/theme-switcher"
import useSWR, { mutate } from "swr"
import type { Folder } from "@/lib/types"
import { Download, Upload, FolderIcon, Skull } from "lucide-react"
import { useRef } from "react"
import Link from "next/link"
import { EditFolderDialog } from "@/components/edit-folder-dialog"
import { Trash2 } from "lucide-react"

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .catch((err) => {
      console.log("[v0] Fetch error:", err)
      return []
    })

export default function MockzillaAdmin() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: folders = [], isLoading: foldersLoading } = useSWR<Folder[]>("/api/folders", fetcher, {
    onError: (error) => {
      console.log("[v0] SWR error:", error)
      toast.error("Failed to load folders", {
        description: "There was an error connecting to the server",
      })
    },
  })

  const handleFolderSuccess = () => {
    toast.success("Folder Created", {
      description: "Your folder has been created successfully",
    })
    mutate("/api/folders")
  }

  const handleError = (message: string) => {
    toast.error("Error", {
      description: message,
    })
  }

  const handleDeleteFolder = async (id: string) => {
    const response = await fetch(`/api/mocks?folderId=${id}`)
    const mocks = await response.json()

    if (mocks.length > 0) {
      toast.error("Cannot Delete Folder", {
        description: "Please delete all mocks in this folder first",
      })
      return
    }

    try {
      await fetch(`/api/folders?id=${id}`, { method: "DELETE" })
      toast.success("Folder Deleted", {
        description: "Folder has been removed",
      })
      mutate("/api/folders")
    } catch {
      toast.error("Error", {
        description: "Failed to delete folder",
      })
    }
  }

  const handleUpdateFolder = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/folders?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Folder Updated", {
        description: "Folder has been updated successfully",
      })
      mutate("/api/folders")
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to update folder",
      })
      throw error
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/export")
      const data = await response.json()

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mockzilla-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Export Successful", {
        description: `Exported ${data.folders.length} folders and ${data.mocks.length} mocks`,
      })
    } catch {
      toast.error("Export Failed", {
        description: "Failed to export data",
      })
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Import failed")
      }

      const result = await response.json()

      toast.success("Import Successful", {
        description: `Imported ${result.imported.folders} folders and ${result.imported.mocks} mocks`,
      })

      mutate("/api/folders")
    } catch {
      toast.error("Import Failed", {
        description: "Failed to import data. Please check the file format.",
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-26 items-center justify-center rounded-xl">
                <img src="/mockzilla-logo.png" alt="Mockzilla Logo" />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter text-foreground">Mockzilla</h1>
                <p className="mt-1 text-sm font-medium text-primary/80">Powerful API Mocking Unleashed</p>
              </div>
            </div>
            <div className="flex gap-2">
              <ThemeSwitcher />
              <QuickMockDialog folders={folders} />
              <Button variant="outline" onClick={handleExport} className="mockzilla-border bg-card/50 backdrop-blur-sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mockzilla-border bg-card/50 backdrop-blur-sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Create Folder Form */}
          <div className="lg:col-span-1">
            <Card className="mockzilla-border mockzilla-glow border-2 bg-card/50 backdrop-blur-sm p-6">
              <h2 className="mb-4 text-2xl font-bold text-card-foreground">Create Folder</h2>
              <FolderForm onSuccess={handleFolderSuccess} onError={handleError} />
            </Card>
          </div>

          {/* Right Column - Folders Grid */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Folders</h2>
              <span className="rounded-lg bg-primary/20 px-3 py-1 text-sm font-semibold text-primary mockzilla-border">
                {folders.length} {folders.length === 1 ? "folder" : "folders"}
              </span>
            </div>

            {foldersLoading ? (
              <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
                <p className="text-center text-muted-foreground">Loading...</p>
              </Card>
            ) : folders.length === 0 ? (
              <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-12">
                <div className="text-center">
                  <FolderIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-semibold text-muted-foreground">No folders created yet</p>
                  <p className="mt-1 text-sm text-muted-foreground/75">
                    Create your first folder to organize your mocks
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {folders.map((folder) => (
                  <Link href={`/folder/${folder.slug}`} key={folder.id}>
                    <Card className="mockzilla-border mockzilla-card-hover group border-2 bg-card/50 backdrop-blur-sm h-full">
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 transition-all group-hover:from-primary/30 group-hover:to-accent/30">
                              <FolderIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
                                {folder.name}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">/{folder.slug}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 border-t border-border mt-4 pt-3">
                          <EditFolderDialog folder={folder} onUpdate={handleUpdateFolder} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              handleDeleteFolder(folder.id)
                            }}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
