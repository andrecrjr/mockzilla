# Mockzilla Agent

Last updated: 2025-12-02
Scope: Next.js app under `app/` with API routes and supporting libs under `lib/`. This catalog defines callable agents, their capabilities, inputs/outputs, constraints, and cross-references to detailed docs in `documentation/`.

- You only use bun, and docker to get all context about server.
- You never use npm or yarn.

## Conventions
- MCP: Use `http://localhost:36666/api/mcp` as the MCP endpoint.
- Always use Docker to get all context about server.
- Use bun for commands to update install or run scripts, but always use docker to run over the server.
- Makefile is the main entry point for all commands.
- Context Boundary: Each agent entry is self-contained; do not mix details across agents when prompting.
- Code References: Use `file_path:line_number` to jump precisely.
- Terminology: "folder" groups mocks; "mock" is an individual endpoint response.
- Data Store: PostgreSQL via Drizzle; see `lib/db/schema.ts`.
- **NEVER** use `any` type, ensure always creating types/interfaces or generic types or `unknown`.
- Must use `z.infer<typeof schema>` to extract types from Zod schemas.
- **Always** in the end update `documentation/` folder with updated docs.
- Use **Agent Skills** (`.agent/skills/`) for complex mocking or logic tasks.

## Index
- Mock Serving Agent
- Mocks CRUD Agent
- Folders CRUD Agent
- Import Agent
- Export Agent
- Schema Generator Agent
- API Client Agent
- Local Storage Agent
- Agent Skills Reference

---

## Mock Serving Agent
Tags: #routing #mock #schema #echo #nextjs #drizzle

- Purpose: Serve configured mock responses by folder slug and path; supports static JSON/text, request-body echo, and JSON Schema–driven dynamic responses.
- Entry Point: `app/api/mock/[...path]/route.ts`
  - Path format: `/api/mock/{folderSlug}/{mockPath...}` (app/api/mock/[...path]/route.ts:10)
- Capabilities
  - Resolve folder by slug, then match mock by `endpoint` and `method` (app/api/mock/[...path]/route.ts:19–37).
  - Echo request body back when `echoRequestBody` is enabled (app/api/mock/[...path]/route.ts:45–68).
  - Generate dynamic JSON from `jsonSchema` when `useDynamicResponse` is true (app/api/mock/[...path]/route.ts:70–91), fallback to static response if generation fails (app/api/mock/[...path]/route.ts:82–90).
  - Content type set by `bodyType` (`json` or `text`) (app/api/mock/[...path]/route.ts:94–114).
- Inputs
  - HTTP method: `GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS` (lib/db/schema.ts:5–13).
  - Path segments: `folderSlug`, `mockPath` (app/api/mock/[...path]/route.ts:15–17).
  - DB tables: `folders`, `mockResponses` (lib/db/schema.ts:20–27, 29–47).
- Outputs
  - `NextResponse` with configured `statusCode` and body; JSON or text per `bodyType`.
- Constraints
  - Requires at least two segments: folder slug + mock path (app/api/mock/[...path]/route.ts:11–13).
  - `jsonSchema` must parse as JSON when dynamic mode is enabled.
- Error Handling
  - 404 when folder or mock not found (app/api/mock/[...path]/route.ts:22–24, 39–43).
  - 500 on internal errors (app/api/mock/[...path]/route.ts:115–118).
- Related Docs
  - `documentation/schema-interpolation.md` — how `{$.path}` templates resolve.
  - `documentation/test-schemas.md` — sample schemas for dynamic generation.

---

## Mocks CRUD Agent
Tags: #crud #mock #pagination #drizzle #nextjs

- Purpose: Create, read, update, delete mock definitions; list with pagination.
- Entry Point: `app/api/mocks/route.ts`
- Capabilities
  - GET by `id`, or list paginated with optional `folderId` (app/api/mocks/route.ts:7–106).
  - POST create new mock (app/api/mocks/route.ts:108–149).
  - PUT update by `id` (app/api/mocks/route.ts:156–210).
  - DELETE by `id` (app/api/mocks/route.ts:212–226).
- Inputs
  - Query: `id`, `folderId`, `page`, `limit`.
  - Body: `CreateMockRequest` / `UpdateMockRequest` (lib/types.ts; fields map to `mockResponses`).
- Outputs
  - JSON with normalized fields: `id, name, path, method, response, statusCode, folderId, matchType, bodyType, enabled, jsonSchema, useDynamicResponse, echoRequestBody, createdAt, updatedAt`.
- Constraints
  - `path` should start with `/` (validated in UI; see app/folder/[slug]/mock/[mockId]/page.tsx:47–51).
  - `jsonSchema` must be valid if `useDynamicResponse` is true.
- Error Handling
  - 404 when target not found; 400 for missing `id`; 500 on internal errors.

---

## Folders CRUD Agent
Tags: #crud #folder #slug #drizzle #nextjs

- Purpose: Manage folders (groups of mocks) and pagination.
- Entry Point: `app/api/folders/route.ts`
- Capabilities
  - GET by `slug`, list all, or paginated (app/api/folders/route.ts:15–89).
  - POST create with slug generation (app/api/folders/route.ts:91–121).
  - PUT update by `id` with slug regeneration (app/api/folders/route.ts:123–160).
  - DELETE by `id` (app/api/folders/route.ts:162–176).
- Slug Rules
  - Lowercase, trim, spaces→`-`, non-alphanumerics removed (app/api/folders/route.ts:7–13).
- Outputs
  - JSON folder records with `id, name, slug, description, createdAt, updatedAt`.

---

## Import Agent
Tags: #import #migration #legacy #drizzle

- Purpose: Import dataset of folders + mocks, with support for a legacy format.
- Entry Point: `app/api/import/route.ts`
- Capabilities
  - Detect legacy format with `groups`/`rules` (app/api/import/route.ts:14–16).
  - Convert legacy groups→folders and rules→mocks (app/api/import/route.ts:18–100).
  - Transactional import of folders then mocks (app/api/import/route.ts:120–167).
- Inputs
  - Body: `ExportData` or legacy format (`LegacyImportFormat`) (lib/types.ts).
- Outputs
  - JSON `{ success: boolean, imported: { folders, mocks } }`.

---

## Export Agent
Tags: #export #snapshot #drizzle

- Purpose: Export all folders and mocks in a normalized structure.
- Entry Point: `app/api/export/route.ts`
- Capabilities
  - GET all folders and mocks, map to export schema (app/api/export/route.ts:6–39).
- Outputs
  - `ExportData` with arrays of folders and mocks plus `exportedAt`.

---

## Schema Generator Agent
Tags: #jsonschema #faker #templates #llm-context

- Purpose: Generate sample JSON from JSON Schema with custom formats and template interpolation.
- Module: `lib/schema-generator.ts`
- Capabilities
  - Template interpolation using `{$.path}` or `{{$.path}}` across the generated object (lib/schema-generator.ts:106–201, 232–259).
  - Validation helper `validateSchema` (lib/schema-generator.ts:204–229).
  - Entry point: `generateFromSchema` (lib/schema-generator.ts:240–259).
- Dependencies
  - `@faker-js/faker`, `json-schema-faker` integration (lib/schema-generator.ts:1–3, 17–28).
- Related Docs
  - `documentation/schema-interpolation.md`
  - `documentation/test-schemas.md`

---

## API Client Agent
Tags: #httpclient #external-api #env

- Purpose: Optional client for a remote Mockzilla API; maps server fields into local types.
- Module: `lib/api-client.ts`
- Configuration
  - Base URL via `NEXT_PUBLIC_MOCKZILLA_API_BASE_URL` or `MOCKZILLA_API_BASE_URL` (lib/api-client.ts:15–18).
- Capabilities
  - Folders: list/create/get/update/delete (lib/api-client.ts:63–107).
  - Mocks: list/create/get/update/delete (lib/api-client.ts:109–174).
- Mapping
  - Field mapping functions: `mapServerFolderToFolder`, `mapServerMockToMock` (lib/api-client.ts:35–61).

---

## Local Storage Agent
Tags: #storage #browser #fallback

- Purpose: Client-side localStorage helpers for folders and mocks.
- Module: `lib/storage.ts`
- Capabilities
  - `getAll`, `add`, `update`, `delete` for both folders and mocks (lib/storage.ts:7–29, 31–53).
- Constraint: Only available in browser (`typeof window !== "undefined"`).

---

## Agent Skills Reference
Tags: #skills #automation #creator #architect

- Purpose: Extend agent capabilities with specialized instruction sets located in `.agent/skills/`.
- Skills:
  - `mockzilla-creator`: Expert for high-quality mocks.
  - `mockzilla-workflow-architect`: Expert for stateful logic.
- Usage: "Use [skill-name] to [task description]".
- Related Docs: `documentation/skills.md`.

---

## Data Model (Reference)
- Enums: `http_method`, `match_type`, `body_type` (lib/db/schema.ts:5–18).
- Tables: `folders`, `mock_responses` and relations (lib/db/schema.ts:20–59).

## Prompting Patterns
- Use Skills
  - "Invoke `mockzilla-creator` skill to generate a complex E-commerce schema."
- Serve a mock
  - "Call Mock Serving Agent with method `GET` at `/api/mock/{folderSlug}/users/42`".
- Create a mock
  - "Use Mocks CRUD Agent to POST a JSON mock in folder `{folderId}` with path `/users/{id}` and `statusCode` 200".
- Generate dynamic sample
  - "Use Schema Generator Agent with `generateFromSchemaString` and interpolate `{ $.user.id }` into summary field".

## Additional References
- Reference Guide: `documentation/index.md`.
- UI docs page for interpolation examples: `app/docs/page.tsx`.
- DB client: `lib/db/index.ts` (lib/db/index.ts:1–21).
- MCP Integration: `documentation/mcp.md`.
