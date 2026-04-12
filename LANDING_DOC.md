# Mockzilla Landing Page Architecture Plan

## Objective
Create a public-facing **landing page** for Mockzilla (Docker app only) at the root `/` route, while keeping the existing **app dashboard** accessible under a separate route (e.g., `/app`), and consolidating documentation under `/docs`.

---

## 1. Route Structure

```
/               → New Landing Page (marketing/marketing-style)
/app            → Existing Mockzilla Admin Dashboard (current root page)
/app/folder/[slug]          → Folder detail (unchanged)
/app/extension-data         → Extension sync (unchanged)
/app/extension-data/[slug]  → Extension sync detail (unchanged)
/app/workflows              → Workflows (unchanged)
/app/workflows/[scenarioId] → Workflow detail (unchanged)
/docs           → Documentation v1 (keep existing, migrate to Nextra later)
/docsv2         → Documentation v2 (Nextra MDX, keep as-is)
/api/*          → All API routes (unchanged, prefixed)
```

### Alternative Option B (subdomain split - future):
```
mockzilla.com        → Landing page
app.mockzilla.com    → Dashboard (separate deployment)
docs.mockzilla.com   → Docs (separate deployment)
```
*Not in scope for this plan, but architecture should allow easy extraction later.*

---

## 2. Implementation Strategy

### Phase 1: Move Existing App to `/app` Route

**Goal:** Relocate the current dashboard without breaking functionality.

1. **Create `/app` route group:**
   - Move `app/page.tsx` → `app/app/page.tsx`
   - Move `app/folder/` → `app/app/folder/`
   - Move `app/extension-data/` → `app/app/extension-data/`
   - Move `app/workflows/` → `app/app/workflows/`

2. **Create app-specific layout** (`app/app/layout.tsx`):
   - Reuse current root layout (navbar, theme provider, sonner, analytics)
   - Add "Back to Landing" link in navbar
   - Keep all existing app components unchanged

3. **Update all internal navigation/routing:**
   - Search and replace hardcoded `/` or `/folder` links in components
   - Update API calls if needed (ensure they still hit `/api/*`)
   - Update `middleware.ts` if it has route guards

4. **Update root layout** (`app/layout.tsx`):
   - Remove dashboard-specific navbar
   - Simplify to: just theme provider, sonner, analytics (no navbar)
   - Landing page will have its own navbar

---

### Phase 2: Create New Landing Page at `/`

**Goal:** Build a modern, marketing-style landing page inspired by the Chrome extension landing, but using Mockzilla's existing design system.

#### Landing Page Structure:
```
app/page.tsx              → Landing page component
components/landing/       → Landing-specific components
  ├── Hero.tsx            → Hero section with headline + CTA
  ├── Features.tsx        → Feature grid cards
  ├── Installation.tsx    → Docker installation steps
  ├── MCPSection.tsx      → AI/MCP integration highlight
  ├── Preview.tsx         → Interactive preview/terminal mock
  ├── FAQ.tsx             → FAQ accordion
  ├── LandingNavbar.tsx   → Landing page navbar
  └── LandingFooter.tsx   → Landing page footer
```

#### Design Approach:
- **Use existing shadcn/ui components** (Card, Button, Accordion, Badge)
- **Reuse Mockzilla's color system** (OKLCH purple theme from `globals.css`)
- **Leverage existing classes** (`mockzilla-border`, `mockzilla-glow`, `mockzilla-gradient-light`, `mockzilla-card-hover`)
- **Dark mode support** via existing `theme-provider` and `next-themes`
- **Fonts:** Inter + JetBrains Mono (already configured)

#### Landing Page Sections (inspired by chrome-extension landing):

1. **Navbar:**
   - Logo + "Mockzilla"
   - Links: Features, Installation, Docs
   - "Open App" button (links to `/app`)
   - "GitHub" icon link
   - Theme switcher (reuse `theme-switcher.tsx`)

2. **Hero Section:**
   - Headline: "Mock APIs in 30 Seconds"
   - Subtitle: "Self-hosted Docker-based mock server with JSON Schema + Faker, MCP integration, and stateful workflows"
   - CTA Buttons: "Deploy Now" (scroll to installation), "View Docs" (link to `/docs`)
   - Preview: Terminal-style card showing example mock API response (reuse mock terminal styling)

3. **Features Grid:**
   - JSON Schema + Faker.js integration
   - PostgreSQL-powered mini database
   - Wildcard route variants
   - Workflow mode (stateful scenarios)
   - MCP Integration (24 tools for AI agents)
   - Chrome Extension Sync

4. **Installation Section:**
   - Docker one-liner (copy-to-clipboard)
   - docker-compose snippet
   - Prerequisites list
   - Links to full deployment docs

5. **MCP / AI Integration Highlight:**
   - Showcase AI agent capabilities
   - Claude Desktop / Cursor integration
   - Link to MCP docs

6. **FAQ Section:**
   - "What is Mockzilla?"
   - "Do I need Docker?"
   - "Can I use it without Chrome Extension?"
   - "Is it free?"
   - Use shadcn Accordion component

7. **Footer:**
   - Logo + description
   - Links: GitHub, Docs, Support, Contact
   - Copyright

---

### Phase 3: Consolidate Documentation

**Goal:** Make `/docs` the primary documentation route (keep `/docsv2` as migration target).

1. **Keep `/docs` as-is** for now (v1 hardcoded TSX page)
2. **Plan future migration** from `/docs` to `/docsv2` (Nextra) - out of scope for this plan
3. **Update landing page links** to point to `/docs`
4. **Optional:** Add redirect `/docsv2 → /docs` until migration is complete

---

### Phase 4: Navbar & Navigation Logic

**Create two distinct navbar variants:**

#### Landing Navbar (shown on `/`):
```
[Logo] Mockzilla    Features    Installation    Docs    [Open App] [GitHub] [Theme]
```

#### App Navbar (shown on `/app` and sub-routes):
```
[Logo] Mockzilla    Mocks    Extension Sync    Workflows    [Docs] [Open App] [Theme]
```
- "Docs" links to `/docs`
- "Open App" links to `/app` (or hidden when already on `/app`)
- "Back to Landing" link to `/`

**Implementation:**
- Option A: Two separate layout files (`app/layout.tsx` for landing, `app/app/layout.tsx` for app)
- Option B: Single layout with conditional navbar based on route
- **Recommendation:** Option A (cleaner separation, easier to extract later)

---

## 3. File Structure After Implementation

```
mockzilla/
├── app/
│   ├── layout.tsx                    → Landing layout (no navbar, theme provider)
│   ├── page.tsx                      → Landing page (NEW)
│   ├── globals.css                   → Unchanged
│   ├── app/                          → App dashboard routes
│   │   ├── layout.tsx                → App layout (with navbar)
│   │   ├── page.tsx                  → Dashboard home (MOVED from root)
│   │   ├── folder/[slug]/page.tsx    → Folder detail (MOVED)
│   │   ├── extension-data/           → Extension sync (MOVED)
│   │   ├── workflows/                → Workflows (MOVED)
│   │   └── api/                      → API routes (unchanged location)
│   ├── docs/                         → Docs v1 (unchanged)
│   └── docsv2/                       → Docs v2 Nextra (unchanged)
├── components/
│   ├── landing/                      → Landing components (NEW)
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Installation.tsx
│   │   ├── MCPSection.tsx
│   │   ├── Preview.tsx
│   │   ├── FAQ.tsx
│   │   ├── LandingNavbar.tsx
│   │   └── LandingFooter.tsx
│   ├── ui/                           → shadcn components (unchanged)
│   ├── docs/                         → Docs components (unchanged)
│   └── [existing app components]     → Unchanged
└── ...rest (unchanged)
```

---

## 4. Key Considerations

### Styling
- ✅ Reuse existing Tailwind config, OKLCH colors, fonts
- ✅ Reuse `mockzilla-border`, `mockzilla-glow`, `mockzilla-gradient-light`
- ✅ Reuse shadcn/ui components (Card, Button, Accordion, Badge)
- ✅ Dark mode via existing `theme-provider`

### Routing
- ⚠️ Update all internal `/` references in app components to `/app`
- ⚠️ Test all navigation after move
- ⚠️ Ensure API routes still work (no prefix change)

### SEO & Meta
- Add proper `<title>` and `<meta>` tags to landing page
- Add Open Graph tags for social sharing
- Add favicon (reuse existing)

### Performance
- Landing page should be static/SSG where possible
- Use Next.js `dynamic()` for heavy components if needed
- Leverage existing `next.config.ts` optimizations

### Future-Proofing
- Landing page should be extractable to separate repo/deployment later
- Keep landing and app in separate route groups with separate layouts
- Shared components (theme provider, UI library) stay in `components/`

---

## 5. Implementation Order

1. **Move existing app to `/app`** (Phase 1) - ~2-3 hours
   - Move files, update layout, fix routing
2. **Create landing page components** (Phase 2) - ~3-4 hours
   - Build components, wire up landing page
3. **Test navigation & routes** - ~1 hour
   - Verify all links, API calls, dark mode
4. **Polish & content** - ~1-2 hours
   - Copywriting, responsive design, SEO tags

**Total estimated effort:** 7-10 hours

---

## 6. What's NOT in Scope

- ❌ Migrating `/docs` to `/docsv2` (Nextra) - separate migration plan
- ❌ Subdomain split (`app.mockzilla.com`) - future consideration
- ❌ Chrome Extension landing merge - separate product, separate landing
- ❌ Redesigning existing app dashboard - only relocating, not changing
- ❌ New features or functionality - landing page is presentation-only

---

## 7. Success Criteria

- ✅ Root `/` shows a polished, marketing-style landing page
- ✅ `/app` shows the existing Mockzilla dashboard (unchanged functionality)
- ✅ All internal links and navigation work correctly
- ✅ Dark mode works on both landing and app
- ✅ `/docs` and `/docsv2` remain accessible
- ✅ Landing page is responsive and SEO-friendly
- ✅ No breaking changes to API routes or existing functionality
