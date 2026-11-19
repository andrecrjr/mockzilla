# LLM Documentation (llms.txt)

Mockzilla serves its user docs (`content/docs/**/*.mdx`) as plain Markdown so agents can load only what they need. Skills point agents here first (see `documentation/skills.md`).

## Endpoints

| URL | Content |
| :--- | :--- |
| `/llms.txt` | Summary, **Agent Quick Reference** (server URL, mock URL format, MCP endpoint and tools, CLI entry points, match types), then a link index grouped by docs section. |
| `/llms/docs/<page>.txt` | One page as Markdown. The docs root is `/llms/docs/index.txt`; a section (e.g. `/llms/docs/guides.txt`) lists its pages. Unknown pages return `404`. |
| `/llms-full.txt` | Quick reference plus every page in site order (~90 KB). |

Legacy shapes still resolve to the canonical pages in full (server) mode:

- `/llms.txt/docs/<page>.txt` and `/llms.txt/llms-full.txt` (`next.config.ts` rewrites).
- `/docs/llms.txt` (rewrite) and `/docs/<page>/llms.txt` (`proxy.ts`; Next rewrites cannot put a multi-segment param into a query string, which previously made every scoped link return the Introduction page).

Landing (static export) mode serves `/llms.txt`, `/llms-full.txt`, and the static `/llms/docs/**/*.txt` files only.

Links are relative unless `NEXT_PUBLIC_BASE_URL` is set; set it in deployments so fetch-only agents get absolute URLs.

## Implementation

- `lib/llms-utils.ts`
  - `getDocsHierarchy()` reads `_meta.js` order/titles (split on the first `:` so titles like `How-to: Mocking Infinite Scroll` survive) and skips `hidden: true` pages.
  - `toLlmText()` converts MDX to LLM-friendly Markdown outside fenced code: drops `import`/`export` lines, React components and layout HTML (`div`, `span`, `ul`, …), turns `<Link href>` cards into `- [Title](href): Description`, and converts `<a>`, `<li>`, `<h1-6>`, `<strong>`, `<blockquote>` to Markdown. Code blocks are untouched.
  - `toLlmsTxtPath()` / `llmsSegmentsToDocsPath()` are the single source of truth for page URLs.
  - `renderLlmsSection()` renders one page; `AGENT_QUICK_REFERENCE` and `LLMS_SUMMARY` are shared by the index and full file. Keep the quick reference in sync with `documentation/mcp.md` and `documentation/cli.md`.
- Routes: `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts`, `app/llms/docs/[[...path]]/route.ts` (all `force-static`).
- Tests: `tests/unit/llms-utils.test.ts` checks that every indexed page resolves to itself, plus MDX cleanup and title parsing.
