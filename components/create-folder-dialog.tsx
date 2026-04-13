"use client";

import { FolderPlus, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FieldTooltip } from "@/components/folder-tooltips";
import Link from "next/link";

interface CreateFolderDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function CreateFolderDialog({
  trigger,
  onSuccess,
}: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate slug from name when name changes
  useEffect(() => {
    if (!useCustomSlug) {
      setSlug(generateSlug(name));
    }
  }, [name, useCustomSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name,
          description: description.trim() || undefined,
          slug: slug.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success("Folder Created", {
        description: "Your folder has been created successfully",
      });

      if (onSuccess) {
        onSuccess();
      }

      // Mutate relevant SWR keys to refresh data
      mutate((key) => typeof key === 'string' && key.startsWith('/api/folders'), undefined, { revalidate: true });

      setOpen(false);
      setName("");
      setDescription("");
      setSlug("");
      setUseCustomSlug(false);
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to create folder",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="mockzilla-border bg-card/50 backdrop-blur-sm">
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Folder
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your mock endpoints.{" "}
              <Link href="/docs#overview" className="text-primary hover:underline inline-flex items-center gap-1">
                Learn more <HelpCircle className="h-3 w-3" />
              </Link>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="folder-name">Folder Name</Label>
                <FieldTooltip
                  label="A descriptive name for your folder (e.g., &quot;User APIs&quot;, &quot;Payment Endpoints&quot;)."
                  description="This helps you organize and identify your mock endpoints."
                />
              </div>
              <Input
                id="folder-name"
                placeholder="e.g., User APIs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="folder-description">Description (Optional)</Label>
                <FieldTooltip
                  label="Add context about what this folder contains."
                  description="This is visible only in the admin UI and helps team members understand the folder&apos;s purpose."
                />
              </div>
              <Textarea
                id="folder-description"
                placeholder="Describe what this folder contains..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="folder-slug">URL Slug</Label>
                  <FieldTooltip
                    label="The URL-friendly identifier used in mock endpoint paths."
                    description="Auto-generated from the folder name, but you can customize it. Only lowercase letters, numbers, and hyphens are allowed."
                    example="/api/mock/user-apis/..."
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setUseCustomSlug(!useCustomSlug)}
                >
                  {useCustomSlug ? "Auto-generate" : "Customize"}
                </Button>
              </div>
              <Input
                id="folder-slug"
                placeholder="e.g., user-apis"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={!useCustomSlug}
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  URL: /api/mock/<span className="font-mono">{slug}</span>/...
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim() || !slug.trim()}>
                {isSubmitting ? "Creating..." : "Create Folder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
