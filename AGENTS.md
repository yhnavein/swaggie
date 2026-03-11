# AGENTS.md
Guidance for coding agents working in this repository.

## Project snapshot
- Runtime/tooling: Bun + Node.js (Node >= 18.18)
- Language: TypeScript
- Source code: `src/`
- Tests: `src/**/*.spec.ts` + snapshots in `test/snapshots/`
- Build output: `dist/` (CommonJS)

## Setup
```bash
bun install --frozen-lockfile
```
Use Bun commands by default. CI also runs Bun for build and tests.

## Build, lint, and test commands

### Build
```bash
bun run build
```
Build script does three things:
- transpiles `src/` to `dist/` via Sucrase
- removes built test artifacts from `dist/`
- generates declaration files for exported types

Related scripts:
```bash
bun run types
bun run rm-tests
```

### Test: full suite
```bash
bun test
```

Coverage mode:
```bash
bun test --coverage
```

### Test: single file (important)
```bash
bun test src/index.spec.ts
```

Run by filename pattern:
```bash
bun test genOperations
```

### Test: single test name (important)
```bash
bun test -t "fails with no parameters provided"
```

Run one test pattern inside one file:
```bash
bun test src/index.spec.ts -t "prepareAppOptions"
```

### Snapshots
- snapshot files are machine-generated in `test/snapshots/`
- do not edit snapshots manually

Update snapshots intentionally:
```bash
UPDATE_SNAPSHOTS=1 bun test
```

### Lint / formatting
No dedicated `lint` script exists in `package.json`.

Use Biome:
```bash
bunx @biomejs/biome check .
bunx @biomejs/biome check . --write
```

Or Prettier:
```bash
bunx prettier . --check
bunx prettier . --write
```

Recommended local validation before PR:
```bash
bun run build && bun test
```

## Code style guide

### Formatting
- 2-space indentation
- LF line endings
- semicolons required
- single quotes in JS/TS
- trailing commas: ES5 style
- keep lines around 80-100 chars (Biome 80, EditorConfig 100)
- final newline at end of file

### Imports
- keep imports at the top of each file
- prefer `import type` for type-only imports
- preferred order:
  1. external imports
  2. internal value imports
  3. internal type imports
- let Biome organize imports when possible
- use explicit relative imports (no path alias convention)

### TypeScript
- prefer explicit domain types over `any`
- use `unknown` for truly unknown values, then narrow
- keep exported/public signatures fully typed
- use string-literal unions for constrained options
- reuse shared types from `src/types.ts` where possible
- avoid non-null assertions unless unavoidable

### Naming
- `camelCase` for variables/functions/params
- `PascalCase` for types/interfaces
- `SCREAMING_SNAKE_CASE` for shared constants/defaults
- test names should describe behavior (`should...`, `fails when...`)
- keep filenames aligned with existing patterns (`genTypes.ts`, `*.spec.ts`)

### Error handling
- throw `Error` with actionable messages for invalid input/state
- fail early on invalid config/spec data
- preserve existing error-message contracts when tests assert exact text
- do not swallow errors silently
- in async flows, either propagate errors or return explicit fallback values

### Tests
- framework: `bun:test`
- colocate tests in `src/` with `*.spec.ts`
- add regression tests for bug fixes
- prefer focused assertions over snapshot-only coverage
- when output shape changes intentionally, update snapshots together

### Generated output
- keep output deterministic and stable
- watch operation ordering and naming-collision behavior
- preserve template compatibility unless change is intentional

## Repository-specific conventions
- do not commit `dist/` changes unless task explicitly asks for build artifacts
- do not manually edit files in `test/snapshots/`
- prefer small, isolated changes in `src/gen/`, `src/swagger/`, and `src/utils/`
- when changing options behavior, validate both config-file and CLI-flag paths

## Cursor/Copilot instructions
Checked paths:
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

Status for this repository:
- no Cursor or Copilot instruction files are currently present
- if those files are added later, treat them as higher-priority local instructions

## Suggested agent workflow
1. Read relevant source and adjacent tests first.
2. Implement the smallest safe change.
3. Run targeted tests (`bun test <file>` and/or `bun test -t <pattern>`).
4. Run `bun run build` before finalizing.
5. Run full tests for broad behavior changes.
