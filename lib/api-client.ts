import type {
  Folder,
  Mock,
  CreateFolderRequest,
  UpdateFolderRequest,
  CreateMockRequest,
  UpdateMockRequest,
  HttpMethod,
} from "./types"

// Allow configuring the external Mockzilla API base URL via environment variables.
// Falls back to a sensible default if not provided.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_MOCKZILLA_API_BASE_URL ||
  process.env.MOCKZILLA_API_BASE_URL

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || error.message || `HTTP ${response.status}`)
  }
  return response.json()
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function mapServerFolderToFolder(server: any): Folder {
  return {
    id: server.id,
    name: server.name,
    slug: slugify(server.name || ""),
    createdAt: server.created_at ?? new Date().toISOString(),
    updatedAt: server.updated_at ?? undefined,
  }
}

function mapServerMockToMock(server: any): Mock {
  return {
    id: server.id,
    name: server.name,
    path: server.endpoint || "",
    method: server.method as HttpMethod,
    response: server.response,
    statusCode: server.status_code,
    folderId: server.folder,
    createdAt: server.created_at ?? new Date().toISOString(),
    updatedAt: server.updated_at ?? undefined,
  }
}

export const mockzillaAPI = {
  folders: {
    list: async (): Promise<Folder[]> => {
      const response = await fetch(`${API_BASE_URL}/folders/`)
      const data = await handleResponse(response)
      const items = Array.isArray(data) ? data : data.results || data.folders || []
      return items.map(mapServerFolderToFolder)
    },

    create: async (data: CreateFolderRequest): Promise<Folder> => {
      const response = await fetch(`${API_BASE_URL}/folders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      })
      const json = await handleResponse(response)
      return mapServerFolderToFolder(json)
    },

    get: async (id: string): Promise<Folder> => {
      const response = await fetch(`${API_BASE_URL}/folders/${id}/`)
      const json = await handleResponse(response)
      return mapServerFolderToFolder(json)
    },

    update: async (id: string, data: UpdateFolderRequest): Promise<Folder> => {
      const response = await fetch(`${API_BASE_URL}/folders/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      })
      const json = await handleResponse(response)
      return mapServerFolderToFolder(json)
    },

    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/folders/${id}/`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(error.detail || error.message || `HTTP ${response.status}`)
      }
    },
  },

  mocks: {
    list: async (folderId?: string): Promise<Mock[]> => {
      const url = new URL(`${API_BASE_URL}/mock-responses/`)
      if (folderId) url.searchParams.set("folder", folderId)
      const response = await fetch(url.toString())
      const data = await handleResponse(response)
      const items = Array.isArray(data) ? data : data.results || data.mocks || []
      const mapped = items.map(mapServerMockToMock)
      return folderId ? mapped.filter((m: Mock) => m.folderId === folderId) : mapped
    },

    create: async (data: CreateMockRequest): Promise<Mock> => {
      const response = await fetch(`${API_BASE_URL}/mock-responses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          endpoint: data.path,
          method: data.method,
          status_code: data.statusCode,
          response: data.response,
          folder: data.folderId,
        }),
      })
      const json = await handleResponse(response)
      return mapServerMockToMock(json)
    },

    get: async (id: string): Promise<Mock> => {
      const response = await fetch(`${API_BASE_URL}/mock-responses/${id}/`)
      const json = await handleResponse(response)
      return mapServerMockToMock(json)
    },

    update: async (id: string, data: UpdateMockRequest): Promise<Mock> => {
      const response = await fetch(`${API_BASE_URL}/mock-responses/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          endpoint: data.path,
          method: data.method,
          status_code: data.statusCode,
          response: data.response,
        }),
      })
      const json = await handleResponse(response)
      return mapServerMockToMock(json)
    },

    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/mock-responses/${id}/`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(error.detail || error.message || `HTTP ${response.status}`)
      }
    },
  },
}
