"use client"

import type React from "react"
import { useMemo, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import type { Folder, HttpMethod } from "@/lib/types"
import { validateSchema, generateFromSchemaString } from "@/lib/schema-generator"
import { toast } from "sonner"
import { Info as InfoIcon } from "lucide-react"

type MockFormValues = {
  name: string
  path: string
  method: HttpMethod
  statusCode: string
  folderId?: string
  response: string
  jsonSchema?: string
  useDynamicResponse?: boolean
  echoRequestBody?: boolean
}

interface MockEditorProps {
  mode: "create" | "edit"
  folders?: Folder[]
  defaultFolderId?: string
  initial?: Partial<MockFormValues>
  showFolderSelect?: boolean
  submitLabel?: string
  previewSlug?: string
  isSubmitting?: boolean
  onCancel?: () => void
  onSubmit: (values: MockFormValues) => Promise<void>
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

export function MockEditor({
  mode,
  folders = [],
  defaultFolderId,
  initial,
  showFolderSelect,
  submitLabel,
  previewSlug,
  isSubmitting,
  onCancel,
  onSubmit,
}: MockEditorProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [path, setPath] = useState(initial?.path ?? (mode === "create" ? "/" : ""))
  const [method, setMethod] = useState<HttpMethod>(initial?.method ?? "GET")
  const [statusCode, setStatusCode] = useState<string>(initial?.statusCode ?? "200")
  const [folderId, setFolderId] = useState<string>(initial?.folderId ?? defaultFolderId ?? "")

  const [activeTab, setActiveTab] = useState<"manual" | "schema">(
    initial?.jsonSchema ? "schema" : "manual"
  )
  const [response, setResponse] = useState(initial?.response ?? "")
  const [jsonSchema, setJsonSchema] = useState(initial?.jsonSchema ?? "")
  const [useDynamicResponse, setUseDynamicResponse] = useState<boolean>(Boolean(initial?.useDynamicResponse))
  const [echoRequestBody, setEchoRequestBody] = useState<boolean>(Boolean(initial?.echoRequestBody))
  const previewJson = useRef<HTMLTextAreaElement>(null)
  const hydratedRef = useRef<boolean>(false)

  useEffect(() => {
    const hasInitial = Boolean(initial)
    if (mode === "edit" && hasInitial && !hydratedRef.current) {
      console.log(initial)
      setName(initial?.name ?? "")
      setPath(initial?.path ?? "")
      setMethod((initial?.method ?? "GET") as HttpMethod)
      setStatusCode(String(initial?.statusCode ?? "200"))
      setFolderId(initial?.folderId ?? (defaultFolderId ?? ""))
      setResponse(initial?.response ?? "")
      setJsonSchema(initial?.jsonSchema ?? "")
      setUseDynamicResponse(Boolean(initial?.useDynamicResponse))
      setEchoRequestBody(Boolean(initial?.echoRequestBody))
      setActiveTab(initial?.jsonSchema ? "schema" : "manual")
      hydratedRef.current = true
    }
  }, [initial, mode, defaultFolderId])

  useEffect(() => {
    if (mode !== "edit" || !initial) return
    setMethod((initial.method ?? method) as HttpMethod)
    setStatusCode(String(initial.statusCode ?? statusCode))
  }, [initial?.method, initial?.statusCode, mode])

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const selectedFolder = useMemo(() => {
    return folders.find((f) => f.id === (folderId || defaultFolderId || ""))
  }, [folders, folderId, defaultFolderId])

  const previewUrl = useMemo(() => {
    const baseSlug = previewSlug ?? selectedFolder?.slug
    if (!baseSlug) return null
    if (!path.startsWith("/") || path.length <= 1) return null
    return `${origin}/api/mock/${baseSlug}${path}`
  }, [origin, previewSlug, selectedFolder?.slug, path])

  const showFolder = showFolderSelect ?? (mode === "create" && !defaultFolderId)
  const submitText = submitLabel ?? (mode === "create" ? "Create Mock Endpoint" : "Save Changes")

  const handleGenerateFromSchema = () => {
    const schemaString = jsonSchema.trim()
    if (!schemaString) {
      toast.error("Schema Required", { description: "Paste a JSON Schema to generate" })
      return
    }
    const validation = validateSchema(schemaString)
    if (!validation.valid) {
      toast.error("Invalid Schema", { description: validation.error || "Schema is invalid" })
      return
    }
    try {
      const generated = generateFromSchemaString(schemaString)
      if (previewJson.current) {
        previewJson.current.value = generated
      }
      toast.success("Generated", { description: "Sample JSON generated from schema" })
    } catch (error) {
      toast.error("Generation Failed", {
        description: error instanceof Error ? error.message : "Could not generate from schema",
      })
    }
  }

  const validateBeforeSubmit = (): boolean => {
    if (showFolder && !folderId) {
      toast.error("Error", { description: "Please select a folder" })
      return false
    }
    if (!path.startsWith("/")) {
      toast.error("Error", { description: "Path must start with /" })
      return false
    }
    try {
      if (useDynamicResponse) {
        const validation = validateSchema(jsonSchema)
        if (!validation.valid) {
          throw new Error(validation.error || "Invalid JSON Schema")
        }
        JSON.parse(jsonSchema)
      } else {
        JSON.parse(response)
      }
    } catch {
      toast.error("Error", { description: "Please provide valid JSON" })
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateBeforeSubmit()) return

    const values: MockFormValues = {
      name,
      path,
      method,
      statusCode,
      folderId: folderId || defaultFolderId,
      response,
      jsonSchema,
      useDynamicResponse,
      echoRequestBody,
    }
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} >
      <div className="grid gap-6 py-4 lg:grid-cols-5">
        <div className="space-y-4 col-span-2">
          {showFolder && (
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
                Preview: <span className="text-foreground wrap-break-word">{previewUrl}</span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 flex flex-col col-span-3">
          {["POST", "PUT", "PATCH"].includes(method) && (
            <div className="flex items-center space-x-2 mb-2 p-3 border border-border rounded-lg bg-card/50">
              <Switch checked={echoRequestBody} onCheckedChange={setEchoRequestBody} />
              <div className="space-y-0.5">
                <Label className="cursor-pointer font-medium" onClick={() => setEchoRequestBody(!echoRequestBody)}>
                  Echo Request Body
                </Label>
                <p className="text-xs text-muted-foreground">
                  The response will be exactly what was sent in the request body.
                </p>
              </div>
            </div>
          )}
          
          <div className={echoRequestBody ? "opacity-40 pointer-events-none select-none transition-opacity" : "transition-opacity"}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "schema") }>
            <TabsList>
              <TabsTrigger value="manual">Manual JSON</TabsTrigger>
              <TabsTrigger value="schema">From Schema</TabsTrigger>
            </TabsList>
            <TabsContent value="manual">
              <Label htmlFor="create-json">JSON Response</Label>
              <Textarea
                id="create-json"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder='{"message": "Hello World"}'
                className="font-mono text-sm flex-1 h-[600px] scrollbar-thin"
                required={activeTab === "manual"}
              />
            </TabsContent>
            <TabsContent value="schema">
              <Textarea
                id="schema"
                value={jsonSchema}
                onChange={(e) => setJsonSchema(e.target.value)}
                className="font-mono text-sm flex-1 h-[600px]"
                placeholder="Paste JSON Schema here..."
                required={activeTab === "schema"}
              />
              <div className="flex items-center space-x-2 my-2">
                <Switch checked={useDynamicResponse} onCheckedChange={setUseDynamicResponse} required={activeTab === "schema"} />
                <Label className="cursor-pointer" onClick={() => setUseDynamicResponse(!useDynamicResponse)}>
                  Dynamic Response (new data each request) {activeTab === "schema" && "*"}
                </Label>
                <div className="group relative inline-block">
                  <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-popover border border-border rounded-lg shadow-lg z-50 text-sm">
                    <p className="text-foreground font-semibold mb-1">String Interpolation Supported!</p>
                    <p className="text-muted-foreground mb-2">
                      Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{$.field}"}</code> to reference other generated fields.
                    </p>
                    <p className="text-xs text-primary">
                      <a href="/docs" target="_blank" className="underline hover:text-primary/80" rel="noopener">
                        Learn more in the docs →
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={handleGenerateFromSchema}>
                Generate JSON Preview
              </Button>
              <Textarea
                ref={previewJson}
                id="preview-json"
                className="mt-2 font-mono text-sm flex-1 h-[200px]"
                placeholder="Generated JSON Here"
              />
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : submitText}
        </Button>
      </div>
    </form>
  )
}
