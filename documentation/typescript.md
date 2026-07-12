# TypeScript

Mockzilla uses TypeScript `6.0.3` as a development dependency for project-wide type checking. TypeScript 6 requires explicit ambient type packages, so `tsconfig.json` includes the Node.js and Bun types used by the app and its tests.

Run the checks from the repository root:

```bash
bun run typecheck
bun run lint
```

TypeScript is pinned in `package.json`; update it with Bun so `bun.lock` remains in sync. Do not install it globally.
