# Doc Migration: Hardcoded TSX → Nextra MDX

> **Goal:** Migrate `/docs` from hardcoded TSX components to a Nextra-based MDX system under a new `app/docsv2/` route, keeping the old `app/docs/` fully intact until the new version is ready to replace it.

---

## Migration Todo List

> Check off each step as you complete it. Each task references a specific phase and section below.

- [ ] **[Phase 1] Task 1.1:** Install Nextra packages
- [ ] **[Phase 1] Task 1.2:** Create `mdx-components.tsx` at project root
- [ ] **[Phase 1] Task 1.3:** Create catch-all route `app/docsv2/[[...mdxPath]]/page.tsx`
- [ ] **[Phase 1] Task 1.4:** Create `app/docsv2/layout.tsx` with Nextra Layout wrapper
- [ ] **[Phase 1] Task 1.5:** Add Pagefind as dev dependency and configure
- [ ] **[Phase 1] Task 1.6:** Rebuild Docker image so new route is served
- [ ] **[Phase 1] Task 1.7:** Verify `/docsv2` loads in Chrome using Chrome DevTools
- [ ] **[Phase 2] Task 2.1:** Create `content/docs/` directory structure
- [ ] **[Phase 2] Task 2.2:** Convert Overview section → `content/docs/index.mdx`
- [ ] **[Phase 2] Task 2.3:** Convert Schema & Data docs → `content/docs/schema.mdx`
- [ ] **[Phase 2] Task 2.4:** Convert Wildcard Variants → `content/docs/wildcard-variants.mdx`
- [ ] **[Phase 2] Task 2.5:** Convert Examples section → `content/docs/examples.mdx`
- [ ] **[Phase 2] Task 2.6:** Convert Workflow docs → `content/docs/workflow.mdx`
- [ ] **[Phase 2] Task 2.7:** Convert Extension docs → `content/docs/extension.mdx`
- [ ] **[Phase 2] Task 2.8:** Convert MCP section → `content/docs/mcp.mdx`
- [ ] **[Phase 2] Task 2.9:** Create `content/docs/_meta.js` for sidebar ordering
- [ ] **[Phase 3] Task 3.1:** Preserve `SchemaTesterDialog` as importable client component in MDX
- [ ] **[Phase 3] Task 3.2:** Configure Nextra to support custom shadcn components (Accordion, Card, etc.)
- [ ] **[Phase 3] Task 3.3:** Apply existing Mockzilla theme classes (`mockzilla-border`, `mockzilla-glow`, etc.) to Nextra layout
- [ ] **[Phase 4] Task 4.1:** Test `/docsv2` route — verify all pages render, sidebar works, search works
- [ ] **[Phase 4] Task 4.2:** Cross-check content parity with old `/docs` page
- [ ] **[Phase 5] Task 5.1:** *(Future)* Swap `/docsv2` → `/docs` when ready, remove old `app/docs/`

---

## Phase 1: Install & Configure Nextra

### Task 1.1: Install Packages

```bash
bun add nextra nextra-theme-docs
bun add -D pagefind
```

### Task 1.2: Create `mdx-components.tsx`

Place at project root (`/mockzilla/mdx-components.tsx`):

```tsx
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components: any) {
  return { ...docsComponents, ...components };
}
```

### Task 1.3: Create Catch-All Route

Create `app/docsv2/[[...mdxPath]]/page.tsx`:

```tsx
import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents } from '../../../mdx-components';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

async function Page({ params }: { params: Promise<{ mdxPath?: string[] }> }) {
  const { mdxPath } = await params;
  // @ts-expect-error -- type-safe with content directory
  const result = await importPage(mdxPath);
  const { default: MDXContent, toc, metadata } = result;
  return <MDXContent useMDXComponents={useMDXComponents} toc={toc} metadata={metadata} />;
}

export default Page;
```

### Task 1.4: Create Nextra Layout

Create `app/docsv2/layout.tsx`:

```tsx
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner, Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: { template: '%s | Mockzilla Docs', default: 'Mockzilla Docs' },
  description: 'Mockzilla documentation',
};

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          banner={<Banner storageKey="mockzilla-docs-v2">Mockzilla Docs v2 (Nextra) 🚀</Banner>}
          navbar={<Navbar logo={<b>Mockzilla</b>} />}
          pageMap={await getPageMap()}
          footer={<Footer>MIT {new Date().getFullYear()} © Mockzilla.</Footer>}
          docsRepositoryBase="https://github.com/andrecrjr/mockzilla"
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
```

> **Note:** This layout is nested under `/docsv2`, so the main app layout (`app/layout.tsx`) remains untouched. Nextra's `Layout` will only wrap routes under `/docsv2/**`.

### Task 1.5: Configure Pagefind

```bash
bun add -D pagefind
```

Add to `package.json` scripts:

```json
"postbuild": "pagefind --site .next/server/app --output-path public/pagefind"
```

### Task 1.6: Rebuild Docker Image

The app runs inside Docker, so after adding Nextra files you must rebuild:

```bash
docker compose build mockzilla && docker compose up -d mockzilla
```

> Or use whatever Makefile/docker compose command the project uses. Verify the container includes the new `app/docsv2/` files, `mdx-components.tsx`, and installed packages.

### Task 1.7: Verify `/docsv2` in Chrome via Chrome DevTools

Open the running app in **Chrome** (not another browser) and use **Chrome DevTools** to validate:

1. Navigate to `http://localhost:<port>/docsv2`
2. Open DevTools (`F12` or `Ctrl+Shift+I`)
3. Check:
   - **Console** — no errors or warnings
   - **Network** — page loads with 200 status, no failed chunk requests
   - **Elements** — Nextra navbar, sidebar, and footer are present in the DOM
   - **Application** — Pagefind search index is accessible (if built)
4. Confirm the page renders a Nextra docs shell (empty sidebar is fine — content comes in Phase 2)

> Use Chrome DevTools for all visual verification during this migration — it provides the most reliable rendering and network diagnostics.

---

## Phase 2: Convert Content to MDX

### Task 2.1: Directory Structure

Create `content/docs/` with this layout:

```
content/docs/
├── index.mdx              ← Overview (from app/docs/page.tsx "Overview" section)
├── schema.mdx             ← Schema & Data (from components/docs/schema-docs.tsx)
├── wildcard-variants.mdx  ← Wildcard Variants (from app/docs/page.tsx)
├── examples.mdx           ← Schema Examples (from app/docs/page.tsx "Examples" section)
├── workflow.mdx           ← Workflow Mode (from components/docs/workflow-docs.tsx)
├── extension.mdx          ← Extension Sync (from components/docs/extension-docs.tsx)
├── mcp.mdx                ← MCP + Installation (from app/docs/page.tsx "MCP" section)
└── _meta.js               ← Sidebar ordering & titles
```

### Task 2.2: `content/docs/index.mdx` (Overview)

**Source:** `app/docs/page.tsx` — the `#overview` section (lines ~200-260):
- Feature grid (Dynamic Mocks, Stateful Workflows, Mini-Database, MCP Support)
- FAQ details element

Convert to:

```mdx
---
title: Overview
---

# Mockzilla Documentation

Mockzilla is a powerful API mocking tool designed for modern development workflows.
It supports dynamic response generation, stateful workflows, and AI integration via MCP.

## Features

| Feature | Description |
|---------|-------------|
| **Dynamic Mocks** | Generate realistic data using JSON Schema + Faker |
| **Stateful Workflows** | Simulate complex user flows with persistent state |
| **Mini-Database** | Each scenario gets a transient database for CRUD operations |
| **MCP Support** | First-class AI agent support — let Claude control your mocks |

### Why use Mockzilla over straightforward mocks?

> Mockzilla allows for dynamic responses and stateful scenarios, which lets you
> test complex interactions even when backend APIs aren't ready.
```

### Task 2.3: `content/docs/schema.mdx` (Schema & Data)

**Source:** `components/docs/schema-docs.tsx` (entire file, ~400 lines)

Key sections to convert:
- "The Foundation" — JSON Schema + json-schema-faker intro
- "The Randomness" — Faker.js integration
- "Core Syntax" — Accordion with Faker usage, JSF features, field referencing
- "Interpolation Patterns" — `{$.path}` syntax examples
- "Real-World Recipes" — 4 example schemas (Relational Consistency, Paginated List, Error Envelope, Coherent User Profile)

Use Nextra's `<Steps>`, `<Card>`, `<Tabs>` components where appropriate. Code blocks with `json` syntax highlighting.

### Task 2.4: `content/docs/wildcard-variants.mdx`

**Source:** `app/docs/page.tsx` — `<WildcardVariantsDocs />` component (inline, ~150 lines):
- How It Works explanation
- Capture Key Examples table
- Wildcard Catch-All Variant section with code examples
- Require Match Toggle (ON/OFF comparison)
- Complete Example: User Lookup with Fallback
- Chrome Extension Parity note

### Task 2.5: `content/docs/examples.mdx`

**Source:** `app/docs/page.tsx` — `#examples` section (~100 lines):
- 4 schema examples (Simple Faker List, Referencing Fields, Coherent User Profile, Reuse Stored ID)
- `SchemaTesterDialog` component import (see Phase 3)

### Task 2.6: `content/docs/workflow.mdx`

**Source:** `components/docs/workflow-docs.tsx` (entire file, ~250 lines):
- "Why Workflow Mode?" — Philosophy section (Don't CRUD State vs Do Business Logic)
- Static Mocks vs Workflow Mode comparison
- Core Concepts cards (Scenario, Transition, Mini-DB)
- Deep Dive: Transitions & Conditions (accordion)
- Dynamic Responses & Interpolation (accordion)
- Example 1: Complex Business Logic (Checkout Flow)
- Example 2: Standard CRUD (Create, Read, Update, Delete)
- Debugging Tips

### Task 2.7: `content/docs/extension.mdx`

**Source:** `components/docs/extension-docs.tsx` (entire file, ~100 lines):
- Overview — Extension Integration
- Sync to Server / Import from Server grid
- Sync Flow (Extension → Server) — numbered steps
- Import Flow (Server → Extension) — Merge Strategy

### Task 2.8: `content/docs/mcp.mdx`

**Source:** `app/docs/page.tsx` — `#mcp` section (~100 lines):
- Available Tools grid (Folders & Mocks, Workflows & State)
- Installation & Setup — Option 1: Direct URL
- Installation & Setup — Option 2: Stdio Bridge (mcp-remote)

### Task 2.9: Create `_meta.js`

Create `content/docs/_meta.js`:

```js
export default {
  index: "Overview",
  schema: "Schema & Data Generation",
  "wildcard-variants": "Wildcard Variants",
  examples: "Schema Examples",
  workflow: "Workflow Mode",
  extension: "Extension Sync",
  mcp: "MCP Integration",
};
```

---

## Phase 3: Preserve Interactive & Custom Components

### Task 3.1: SchemaTesterDialog in MDX

The `SchemaTesterDialog` (from `components/docs/schema-tester-dialog.tsx`) is a **client component** with `"use client"`. To use it in MDX:

**Option A — Import via `mdx-components.tsx`:**

```tsx
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';
import { SchemaTesterDialog } from '@/components/docs/schema-tester-dialog';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components: any) {
  return {
    ...docsComponents,
    SchemaTesterDialog,
    ...components,
  };
}
```

Then in any `.mdx` file:

```mdx
<SchemaTesterDialog />
```

**Option B — Named export in the MDX file:**

```mdx
import { SchemaTesterDialog } from '@/components/docs/schema-tester-dialog';

<SchemaTesterDialog />
```

### Task 3.2: Custom shadcn Components in MDX

Nextra provides its own styled components (`<Card>`, `<Steps>`, `<Callout>`, `<Tabs>`), but if you want to keep existing shadcn UI components (Accordion, Dialog, etc.):

Register them in `mdx-components.tsx`:

```tsx
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';
import { SchemaTesterDialog } from '@/components/docs/schema-tester-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components: any) {
  return {
    ...docsComponents,
    SchemaTesterDialog,
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    ...components,
  };
}
```

### Task 3.3: Apply Mockzilla Theme

The current docs use custom CSS classes defined in `app/globals.css`:
- `mockzilla-border`
- `mockzilla-glow`
- `mockzilla-gradient-light`
- `mockzilla-gradient-dark`

Nextra's theme is controlled by `nextra-theme-docs/style.css`. To blend Mockzilla styling:

1. **Option A (Recommended):** Let Nextra handle the base theme, add Mockzilla accent colors via CSS variables in `app/docsv2/layout.tsx`'s `<Head>`:

```tsx
<Head
  color={{
    hue: 262, // purple-ish Mockzilla hue
    saturation: 80,
    lightness: 60,
  }}
/>
```

2. **Option B:** Add custom CSS overrides in a `docsv2.css` file imported by the layout to preserve existing classes for content sections that need them.

---

## Phase 4: Testing & Validation

### Task 4.1: Verify `/docsv2` Route

- `bun dev` → navigate to `http://localhost:3000/docsv2`
- Check:
  - [ ] Sidebar renders with all pages from `_meta.js`
  - [ ] Each page renders with correct content
  - [ ] Code blocks have syntax highlighting
  - [ ] `SchemaTesterDialog` works (opens, generates output)
  - [ ] Internal links between doc pages work
  - [ ] Search works (Pagefind index built)

### Task 4.2: Content Parity Check

Compare old `/docs` vs new `/docsv2`:

| Section | Old `/docs` | New `/docsv2` | Status |
|---------|-------------|----------------|--------|
| Overview | ✅ `#overview` anchor | ✅ `index.mdx` | ⬜ |
| Schema & Data | ✅ `#syntax` anchor | ✅ `schema.mdx` | ⬜ |
| Wildcard Variants | ✅ `#wildcard-variants` anchor | ✅ `wildcard-variants.mdx` | ⬜ |
| Examples | ✅ `#examples` anchor | ✅ `examples.mdx` | ⬜ |
| Workflow Mode | ✅ `#workflows` anchor | ✅ `workflow.mdx` | ⬜ |
| Extension Sync | ✅ `#extension` anchor | ✅ `extension.mdx` | ⬜ |
| MCP | ✅ `#mcp` anchor | ✅ `mcp.mdx` | ⬜ |
| SchemaTesterDialog | ✅ Interactive | ✅ Client component | ⬜ |

---

## Phase 5: Cutover (Future — Not Yet)

### Task 5.1: Swap Routes

When `/docsv2` is fully validated:

1. Rename `app/docs/` → `app/docs-old/` (keep as backup)
2. Rename `app/docsv2/` → `app/docs/`
3. Update any internal navigation links across the app
4. Remove old `components/docs/schema-docs.tsx`, `workflow-docs.tsx`, `extension-docs.tsx`
5. Update the inline `WildcardVariantsDocs`, Overview, Examples, MCP sections — they can be deleted from `app/docs/page.tsx` since content now lives in `.mdx` files
6. Remove the banner from Nextra layout
7. Update `_meta.js` if needed

> **Do NOT do this phase until Phase 4 is fully signed off.**

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Route for new docs | `/docsv2` | Non-destructive, old docs stay live |
| Content location | `content/docs/` | Standard Nextra convention, separate from `app/` |
| Component approach | Register in `mdx-components.tsx` | Available globally across all MDX pages |
| Theme | Nextra default + Mockzilla accent color | Clean look with minimal custom CSS |
| Old docs removal | Phase 5 (future) | Zero risk of breaking current users |
