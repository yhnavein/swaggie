# Configuration

For anything beyond a one-off run, a **configuration file** is the cleaner approach. It keeps all your settings version-controlled alongside your code and makes regeneration a single command.

## Creating a config file

Create a JSON file (conventionally named `swaggie.config.json`) at the root of your project:

```json
{
  "$schema": "https://yhnavein.github.io/swaggie/schema.json",
  "src": "https://petstore3.swagger.io/api/v3/openapi.json",
  "out": "./src/api/petstore.ts",
  "template": "axios",
  "baseUrl": "/api",
  "preferAny": false,
  "skipDeprecated": false,
  "servicePrefix": "",
  "dateFormat": "Date",
  "nullableStrategy": "ignore",
  "generationMode": "full",
  "schemaDeclarationStyle": "interface",
  "enumDeclarationStyle": "union",
  "enumNamesStyle": "original",
  "queryParamsSerialization": {
    "arrayFormat": "repeat",
    "allowDots": true
  }
}
```

Then run:

```bash
swaggie -c swaggie.config.json
```

::: tip Editor autocompletion
The `$schema` field enables full autocompletion and inline documentation in VS Code, WebStorm, and any other editor that supports JSON Schema. You'll see descriptions and valid values for every option as you type.
:::

## All configuration options

### `src` <Badge type="danger" text="required" />

**Type:** `string`

URL or local file path to the OpenAPI spec. Accepts `.json` and `.yaml` files.

```json
{ "src": "https://api.example.com/openapi.json" }
{ "src": "./specs/openapi.yaml" }
```

---

### `out` <Badge type="danger" text="required" />

**Type:** `string`

Output file path for the generated TypeScript client. Omit when using the programmatic API if you want the code returned as a string.

```json
{ "out": "./src/api/client.ts" }
```

---

### `template`

**Type:** `string | [string, string]` &nbsp; **Default:** `"axios"`

The template to use for code generation. Accepts:

- A single HTTP client template name: `"axios"`, `"fetch"`, `"xior"`, `"ng1"`, `"ng2"`
- A single reactive layer template name (defaults to `fetch` as the HTTP client): `"swr"`, `"tsq"`
- A 2-element array pairing a reactive layer with an HTTP client: `["swr", "axios"]`, `["tsq", "xior"]`, etc.
- A path to a custom template directory

See [Templates](/guide/templates) for a full comparison and valid combinations.

```json
{ "template": "fetch" }
```

---

### `baseUrl`

**Type:** `string` &nbsp; **Default:** `""`

The default base URL baked into the generated client. Useful when your API is always at a known path prefix (e.g., `/api`).

```json
{ "baseUrl": "/api/v1" }
```

---

### `generationMode`

**Type:** `"full" | "schemas"` &nbsp; **Default:** `"full"`

Controls what gets generated:

| Value | Output |
|---|---|
| `"full"` | Client methods + all referenced TypeScript schemas |
| `"schemas"` | Only TypeScript schemas — all `components/schemas` entries, no client methods |

Use `"schemas"` when you only need types (e.g., for form validation or server-side code).

---

### `schemaDeclarationStyle`

**Type:** `"interface" | "type"` &nbsp; **Default:** `"interface"`

How object schemas are declared in the output:

```typescript
// "interface" (default)
export interface Pet { id?: number; name: string; }

// "type"
export type Pet = { id?: number; name: string; };
```

---

### `enumDeclarationStyle`

**Type:** `"union" | "enum"` &nbsp; **Default:** `"union"`

How plain string enums are declared:

```typescript
// "union" (default)
export type Status = 'available' | 'pending' | 'sold';

// "enum"
export enum Status { available = 'available', pending = 'pending', sold = 'sold' }
```

::: info
Non-string enums (numeric, mixed) are always emitted as union types regardless of this setting.
:::

---

### `enumNamesStyle`

**Type:** `"original" | "PascalCase"` &nbsp; **Default:** `"original"`

Controls how enum member names are formatted when generating TypeScript `enum` declarations. Only takes effect when `enumDeclarationStyle` is set to `"enum"`.

```typescript
// "original" (default) — member names match the raw enum values
export enum Status { active = 'active', 'not active' = 'not active' }

// "PascalCase" — member names are converted to PascalCase
export enum Status { Active = 'active', NotActive = 'not active' }
```

The enum **values** are never modified — only the member names are transformed. This is useful when you want clean, idiomatic TypeScript identifiers for your enum members without changing the wire format.

::: tip
The CLI accepts both `--enumNamesStyle PascalCase` and `--enumNamesStyle pascal` as equivalent values.
:::

---

### `nullableStrategy`

**Type:** `"ignore" | "include" | "nullableAsOptional"` &nbsp; **Default:** `"ignore"`

How `nullable: true` fields in the spec are handled. See [Nullable Strategy](/guide/advanced#nullable-strategy) for a detailed explanation.

---

### `dateFormat`

**Type:** `"Date" | "string"` &nbsp; **Default:** `"Date"`

Controls the TypeScript type used for `format: date` and `format: date-time` schema fields.

```typescript
// "Date" (default)
createdAt: Date;

// "string"
createdAt: string;
```

---

### `preferAny`

**Type:** `boolean` &nbsp; **Default:** `false`

When `true`, uses `any` instead of `unknown` for untyped / free-form values. Useful when migrating a large codebase where `unknown` would require too many type guards.

---

### `skipDeprecated`

**Type:** `boolean` &nbsp; **Default:** `false`

When `true`, operations marked `deprecated: true` in the spec are excluded from the generated output.

---

### `useClient`

**Type:** `boolean` &nbsp; **Default:** `false`

When `true`, prepends `'use client';` as the very first line of the generated hooks file (when `hooksOut` is set) or the main generated file (single-file mode). Required for [Next.js App Router](https://nextjs.org/docs/app) when using `swr` or `tsq` templates, which produce React hooks that can only run inside Client Components.

```json
{ "useClient": true }
```

Has no effect and should not be used outside of Next.js App Router (RSC) environments.

---

### `hooksOut`

**Type:** `string` &nbsp; **Default:** not set

Output path for the generated reactive hooks file. Only applicable when using an L2 template (`swr`, `tsq`). When set, Swaggie generates **two files**:

- **`out`** — HTTP client objects (`petClient`, `storeClient`, …) + TypeScript types. No `'use client'` directive. Safe to import on the server side (e.g. Next.js Server Components or API routes).
- **`hooksOut`** — Reactive hook namespaces (`pet.queries`, `pet.mutations`, `pet.queryKeys`, …). Imports the main file as `import * as API from './api'`. Gets the `'use client'` directive when `useClient` is set.

This is the recommended setup for **Next.js App Router** projects that want server-safe clients alongside client-only hooks.

```json
{
  "src": "./openapi.yaml",
  "out": "./src/api/client.ts",
  "hooksOut": "./src/api/hooks.ts",
  "template": ["swr", "axios"],
  "useClient": true
}
```

```bash
swaggie -s ./openapi.yaml -o ./src/api/client.ts --hooksOut ./src/api/hooks.ts -t swr,axios --useClient
```

::: tip Usage in Next.js
Import `petClient` from `./client` in Server Components or API routes. Import `pet.queries.usePetById` from `./hooks` inside Client Components only.
:::

Requires `out` to also be set.

---

### `clientSetup`

**Type:** `string` &nbsp; **Default:** not set

Output path for a write-once client setup file. On the first run Swaggie generates this file; on subsequent runs it is **never overwritten** (use `forceSetup` to override that behaviour).

The role of the file depends on the template:

- **`ky`** — The generated `api.ts` imports from this file and uses its exported `createKyConfig()` to initialise the ky instance with interceptors and hooks. You are expected to customise this file once.
- **Other templates (`axios`, `xior`, `fetch`, …)** — The file is a standalone scaffold showing how to configure the exported HTTP client. The generated `api.ts` does **not** import it; it is purely a starting point for your own setup code.

```json
{ "clientSetup": "./src/api/api.setup.ts" }
```

Requires `out` to also be set.

---

### `forceSetup`

**Type:** `boolean` &nbsp; **Default:** `false`

When `true`, overwrites the client setup file even if it already exists. Useful when you want to regenerate the scaffold after a template change or major upgrade.

```json
{ "forceSetup": true }
```

Has no effect unless `clientSetup` is also set.

---

### `servicePrefix`

**Type:** `string` &nbsp; **Default:** `""`

A string prepended to every generated service (client object) name. Useful when generating clients for multiple APIs to avoid naming collisions.

```json
{ "servicePrefix": "Petstore" }
```

This would turn `petClient` into `PetstorePetClient`.

---

### `queryParamsSerialization`

**Type:** `object`

Controls how query parameters are serialized. The defaults match what ASP.NET Core expects.

```json
{
  "queryParamsSerialization": {
    "allowDots": true,
    "arrayFormat": "repeat"
  }
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `allowDots` | `boolean` | `true` | Use dot notation for nested objects (`a.b=1` instead of `a[b]=1`) |
| `arrayFormat` | `"repeat" \| "brackets" \| "indices"` | `"repeat"` | How arrays are serialized in the query string |
| `queryParamsAsObject` | `boolean \| number` | — | Group all query parameters into a single typed object argument. `true` always groups; a number `N` groups only when there are more than `N` query params |

See [Query Parameter Serialization](/guide/advanced#query-parameter-serialization) and [Query Parameter Grouping](/guide/advanced#query-parameter-grouping) for full details.

---

### `mocks`

**Type:** `string`

Output path for the generated mock/stub file. When set, Swaggie writes a companion file exporting typed spy stubs for every client method and hook. Requires `testingFramework` and `out` to also be set.

```json
{ "mocks": "./src/__mocks__/api.ts" }
```

See [Mocking](/guide/mocking) for a full guide.

---

### `testingFramework`

**Type:** `"vitest" | "jest"`

The test framework whose spy functions (`vi.fn()` or `jest.fn()`) are used in the generated mock file. Requires `mocks` and `out` to also be set.

```json
{ "testingFramework": "vitest" }
```

---

### `modifiers`

**Type:** `object`

Override the required/optional/ignored status of specific parameters globally, without modifying the spec.

```json
{
  "modifiers": {
    "parameters": {
      "clientId": "ignore",
      "orgId": "optional",
      "country": "required"
    }
  }
}
```

| Value | Effect |
|---|---|
| `"ignore"` | Parameter is removed from all generated method signatures |
| `"optional"` | Parameter is always optional regardless of what the spec says |
| `"required"` | Parameter is always required |

See [Parameter Modifiers](/guide/advanced#parameter-modifiers) for more detail.
