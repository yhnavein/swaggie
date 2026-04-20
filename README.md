<div style="text-align: center; margin: 0px auto 30px; max-width: 600px">
  <img src="./docs/public/swaggie-full.png" alt="Swaggie logo">
</div>

# Swaggie

![npm latest version](https://img.shields.io/npm/v/swaggie)
![NodeCI](https://github.com/yhnavein/swaggie/workflows/NodeCI/badge.svg)
![Test Coverage](https://img.shields.io/badge/test_coverage-98%25-brightgreen)
![npm downloads](https://img.shields.io/npm/dw/swaggie.svg)
![npm install size](https://packagephobia.now.sh/badge?p=swaggie)

Swaggie generates TypeScript client code from an OpenAPI 3 specification. Instead of writing API-fetching code by hand, you point Swaggie at your API spec and it outputs a fully typed, ready-to-use client — helping you catch errors at compile time rather than at runtime.

See the [Example section](#example) for a quick demo, or visit the full documentation at **[yhnavein.github.io/swaggie](https://yhnavein.github.io/swaggie/)** for guides, configuration reference, and an interactive playground.

> Inspired by [OpenApi Client](https://github.com/mikestead/openapi-client).

---

## Features

- Generates TypeScript code from OpenAPI 3.0, 3.1, and 3.2 specs
- Supports multiple HTTP client libraries out of the box: `fetch`, `axios`, `xior`, `ky`, `Angular 1`, `Angular 2+`; with optional reactive layers (`swr`, `tsq`) that compose with any compatible HTTP client
- **Auto-generated mock/stub files** for Vitest and Jest — typed spies for every client method and hook, with ergonomic helpers like `mockSWR()` and `mockQuery()`
- Custom templates — bring your own to fit your existing codebase
- Supports `allOf`, `oneOf`, `anyOf`, `$ref`, nullable types, and various enum definitions
- Handles multiple content types: JSON, plain text, multipart/form-data, URL-encoded, and binary
- JSDoc comments on all generated functions
- Generates a single, small, tree-shakable output file
- Dev-only dependency — zero runtime overhead
- Ability to generate automatic client mocks for `vitest` and `jest`

---

## Installation

Install as a dev dependency in your project:

```bash
npm install swaggie --save-dev
```

Or install globally to use from anywhere:

```bash
npm install swaggie -g
```

---

## OpenAPI Version Support

Swaggie supports **OpenAPI 3.0 and newer**. OpenAPI 2.0 (Swagger) is not supported.

If your backend still produces a 2.0 spec, you have a few options:

- **(Recommended)** Update your backend to generate an OpenAPI 3.0 spec instead
- Convert your 2.0 spec to 3.0 using [swagger2openapi](https://www.npmjs.com/package/swagger2openapi)
- Stay on `Swaggie v0.x` if upgrading is not currently possible

---

## Quick Start

### CLI

Run Swaggie from the command line:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./client/petstore.ts
```

**Available options:**

```
-V, --version                  Output the version number
-c, --config <path>            Path to a JSON configuration file
-s, --src <url|path>           URL or file path to the OpenAPI spec
-o, --out <filePath>           Output file path (omit to print to stdout)
-b, --baseUrl <string>         Base URL that will be used as a default value in the clients
-t, --template <string>        Template to use. Single name: "axios", "fetch", "xior", "ky", "ng1", "ng2", "swr", "tsq". Reactive pair: "swr,axios" / "tsq,xior" / etc. (default: "axios")
-m, --mode <mode>              Generation mode: "full" or "schemas" (default: "full")
-d, --schemaStyle <style>      Schema object style: "interface" or "type" (default: "interface")
    --enumStyle <style>        Enum style for plain string enums: "union" or "enum" (default: "union")
    --enumNamesStyle <s>       Enum member name casing: "original" or "PascalCase" (default: "original")
    --dateFormat <format>      How date fields are emitted in generated types
    --nullables <strategy>     Nullable handling: "include", "nullableAsOptional", or "ignore"
    --preferAny                Use "any" instead of "unknown" for untyped values (default: false)
    --skipDeprecated           Exclude deprecated operations from the output (default: false)
    --servicePrefix            Prefix for service names — useful when generating multiple APIs
    --allowDots                Use dot notation to serialize nested object query params
    --arrayFormat              How arrays are serialized: "indices", "repeat", or "brackets"
-C, --useClient                Prepend 'use client'; to the hooks file (with --hooksOut) or the main file (single-file mode)
    --hooksOut <filePath>      Output path for the generated hooks file (L2 templates only). Splits hooks into a separate server-safe file
    --mocks <path>             Output path for a generated mock/stub file (requires --testingFramework and --out)
-T, --testingFramework <name>  Framework for generated mocks: "vitest" or "jest" (requires --mocks and --out)
    --clientSetup <path>       Output path for the write-once client setup file. Generated on first run; never overwritten unless --forceSetup is set. For the ky template, the generated api.ts imports from this file. For other templates, it is a standalone scaffold. Requires --out
    --forceSetup               Overwrite the setup file even if it already exists (requires --clientSetup)
-h, --help                     Show help
```

### Formatting the Output

Swaggie produces functional TypeScript, but the formatting is not always perfect. It is recommended to pipe the output through a formatter. For example, using Prettier:

```bash
swaggie -s $URL -o ./client/petstore.ts && prettier ./client/petstore.ts --write
```

This can be added as an `npm` script in your project for easy re-generation.

---

## Configuration File

For anything beyond a one-off run, a configuration file is the cleaner approach. Create a JSON file with your settings and pass it via `-c`:

```bash
swaggie -c swaggie.config.json
```

**Example configuration:**

```json
{
  "$schema": "https://raw.githubusercontent.com/yhnavein/swaggie/master/schema.json",
  "src": "https://petstore3.swagger.io/api/v3/openapi.json",
  "out": "./src/client/petstore.ts",
  "template": "axios",
  "baseUrl": "/api",
  "preferAny": true,
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

The `$schema` field enables autocompletion and inline documentation in most editors.

---

## Templates

Swaggie's templates are split into two independent layers that you can combine freely.

### HTTP client templates

These are standalone and cover the most common client libraries:

| Template | Description |
| -------- | ----------- |
| `axios`  | Default. Recommended for React, Vue, and most Node.js projects |
| `fetch`  | Native browser/Node 18+ Fetch API — zero runtime dependencies |
| `xior`   | Lightweight Axios-compatible alternative ([xior](https://github.com/suhaotian/xior#intro)) |
| `ky`     | Modern fetch-based HTTP client with hooks ([ky](https://github.com/sindresorhus/ky)) |
| `ng1`    | Angular 1 client |
| `ng2`    | Angular 2+ client (uses `HttpClient` and `InjectionToken`) |

### Reactive query layer templates

These add a reactive data-fetching layer (SWR or TanStack Query hooks) on top of any compatible http client. They cannot be used alone — pair them with a basic template using a 2-element array:

| Template | Description |
| -------- | ----------- |
| `swr`    | [SWR](https://swr.vercel.app) hooks for queries and mutations |
| `tsq`    | [TanStack Query](https://tanstack.com/query) hooks for queries and mutations |

Compatible http client templates: `axios`, `fetch`, `xior`, `ky`. Angular clients are not compatible with reactive layers.

### Usage examples

**Single http template (existing behaviour):**

```json
{ "template": "axios" }
```

```bash
swaggie -s ./openapi.json -o ./client.ts -t axios
```

**Pair combination — in config:**

```json
{ "template": ["swr", "axios"] }
```

```bash
# CLI: comma-separated pair
swaggie -s ./openapi.json -o ./client.ts -t swr,axios
swaggie -s ./openapi.json -o ./client.ts -t tsq,xior
swaggie -s ./openapi.json -o ./client.ts -t swr,fetch
```

**Reactive template only — defaults to `fetch` as the http client:**

```json
{ "template": "swr" }
```

### Custom templates

Pass the path to your own template directory as the template value:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./client/petstore.ts --template ./my-swaggie-template/
```

Custom paths also work as part of a composite pair: `["./my-l2", "axios"]`.

---

## Example

Let's say you're building a TypeScript client for the [PetStore API](https://petstore3.swagger.io). Instead of writing fetch calls by hand, run:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./api/petstore.ts && prettier ./api/petstore.ts --write
```

Swaggie will generate something like this:

```typescript
// ./api/petstore.ts

import Axios, { AxiosPromise } from 'axios';

const axios = Axios.create({
  baseURL: '/api',
  paramsSerializer: (params: any) =>
    encodeParams(params, null, {
      allowDots: true,
      arrayFormat: 'repeat',
    }),
});

/** [...] **/

export const petClient = {
  /**
   * @param petId
   */
  getPetById(petId: number): AxiosPromise<Pet> {
    let url = `/pet/${encodeURIComponent(`${petId}`)}`;

    return axios.request<Pet>({
      url: url,
      method: 'GET',
    });
  },

  // ... and other methods ...
};
```

You can then use it directly in your application code:

```typescript
// app.ts

import { petClient } from './api/petstore';

petClient.getPetById(123).then((pet) => console.log('Pet: ', pet));
```

If the API removes an endpoint you rely on, re-running Swaggie will cause a **compile-time error** — not a runtime surprise for your users.

---

## Advanced Configuration

### Query Parameter Serialization

Different backends expect query parameters in different formats. Swaggie lets you control this via the `queryParamsSerialization` config. The default values match what ASP.NET Core expects.

Here's how the object `{ "a": { "b": 1 }, "c": [2, 3] }` is serialized under each combination:

| Result                  | `allowDots` | `arrayFormat` |
| ----------------------- | ----------- | ------------- |
| `?a.b=1&c=2&c=3`        | `true`      | `repeat`      |
| `?a.b=1&c[]=2&c[]=3`    | `true`      | `brackets`    |
| `?a.b=1&c[0]=2&c[1]=3`  | `true`      | `indices`     |
| `?a[b]=1&c=2&c=3`       | `false`     | `repeat`      |
| `?a[b]=1&c[]=2&c[]=3`   | `false`     | `brackets`    |
| `?a[b]=1&c[0]=2&c[1]=3` | `false`     | `indices`     |

Once you identify what your backend expects, update your config:

```json
{
  "queryParamsSerialization": {
    "arrayFormat": "repeat",
    "allowDots": true
  }
}
```

### Nullable Strategy

OpenAPI 3.0 allows fields to be marked as `nullable: true`. Swaggie gives you three ways to handle this in the generated TypeScript, via the `nullableStrategy` option:

| Value                  | Behavior                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| `"ignore"` _(default)_ | `nullable` is ignored — the field is typed as if it were not nullable |
| `"include"`            | Appends `\| null` to the type (e.g. `string \| null`)                 |
| `"nullableAsOptional"` | Makes the field optional (`?`) instead of adding `\| null`            |

**Example** — given `tenant: { type: 'string', nullable: true }` (required):

```typescript
// nullableStrategy: "ignore"            →  tenant: string;
// nullableStrategy: "include"           →  tenant: string | null;
// nullableStrategy: "nullableAsOptional"  →  tenant?: string;
```

### Generation Mode

Use `generationMode` (or CLI `--mode`) to control what gets generated:

| Value       | Behavior                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| `"full"`   | Generates full client code + used schemas (default, existing behavior)         |
| `"schemas"`| Generates only schemas and includes all component schemas by default            |

`"schemas"` mode intentionally does not run the used-schema heuristic.

### Schema Declaration Style

Use `schemaDeclarationStyle` (or CLI `--schemaStyle`) to control object schema output:

| Value         | Behavior                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| `"interface"`| `export interface Tag { ... }` (default)                                |
| `"type"`     | `export type Tag = { ... };`                                             |

### Enum Declaration Style

Use `enumDeclarationStyle` (or CLI `--enumStyle`) for plain string enums:
- `"union"` (default): `export type Status = "active" | "disabled";`
- `"enum"`: `export enum Status { active = "active", disabled = "disabled" }`

Note: this applies only to plain string enums. Non-string enums are still emitted as union types.

### Enum Names Style

Use `enumNamesStyle` (or CLI `--enumNamesStyle`) to control the casing of enum member names when `enumDeclarationStyle` is `"enum"`:
- `"original"` (default): member names are used exactly as they appear in the spec
- `"PascalCase"`: member names are converted to PascalCase

### `x-ts-type` Extension

Add `x-ts-type` to any schema in your spec to emit a verbatim TypeScript type string instead of deriving it from the schema definition. This is useful for intersection types, complex mapped types, or any TypeScript construct that cannot be expressed in OpenAPI's type system:

```yaml
ResourceAccess:
  x-ts-type: >-
    { items?: { [key: string]: Entry } } & { [key: string]: boolean | Entry | undefined }
  type: object   # kept for doc/validation purposes
```

Swaggie emits exactly:
```typescript
export type ResourceAccess = { items?: { [key: string]: Entry } } & { [key: string]: boolean | Entry | undefined };
```

`x-ts-type` takes precedence over all other schema fields, including `$ref`. See the [full documentation](https://yhnavein.github.io/swaggie/guide/advanced#x-ts-type-extension) for more detail.

### Parameter Modifiers

Sometimes an API spec marks a parameter as required, but your client handles it in an interceptor and you don't want it cluttering every method signature. Parameter modifiers let you override this globally without touching the spec.

**Example:**

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

- `"ignore"` — the parameter is removed from all generated method signatures
- `"optional"` — the parameter becomes optional regardless of what the spec says
- `"required"` — the parameter is always required (generally better to just fix the spec)

### Code Quality

Swaggie's output is functional but not always perfectly formatted, since it uses a templating engine internally. It is strongly recommended to run the output through a formatter to ensure consistent style across regenerations.

**Prettier** (most popular):

```bash
prettier ./FILE_PATH.ts --write
```

**Biome** (fast alternative):

```bash
biome check ./FILE_PATH.ts --apply-unsafe
```

Either tool needs to be installed separately and configured for your project.

---

## Next.js App Router — Split-file Mode

SWR and TanStack Query hooks can only run in React Client Components. In Next.js App Router projects you may want:

- The HTTP clients and types available on **both** the server and client sides
- The reactive hooks restricted to **Client Components only** (with `'use client';`)

Use `--hooksOut` to generate two separate files:

```bash
swaggie -s ./openapi.yaml \
  -o ./src/api/client.ts \
  --hooksOut ./src/api/hooks.ts \
  -t swr,axios \
  --useClient
```

Or in a config file:

```json
{
  "src": "./openapi.yaml",
  "out": "./src/api/client.ts",
  "hooksOut": "./src/api/hooks.ts",
  "template": ["swr", "axios"],
  "useClient": true
}
```

This produces:

- `client.ts` — HTTP client objects + TypeScript types. No `'use client'` directive. Safe to import in Server Components and API routes.
- `hooks.ts` — Reactive hook namespaces. Has `'use client';` at the top. Imports the main file as `import * as API from './client'`.

In your components:

```ts
// Server Component or API route — no 'use client' needed
import { petClient } from './api/client';

// Client Component only
import { pet } from './api/hooks';
```

---

## Generating Mocks

Swaggie can generate a companion mock file alongside your client — a set of typed spy stubs for every method and hook, ready to drop into your tests.

```bash
swaggie -s ./spec.json -o ./src/api/client.ts -t swr,axios \
  --mocks ./src/__mocks__/api.ts --testingFramework vitest
```

Or in a config file:

```json
{
  "src": "./openapi.json",
  "out": "./src/api/client.ts",
  "template": ["swr", "axios"],
  "mocks": "./src/__mocks__/api.ts",
  "testingFramework": "vitest"
}
```

The generated mock file exports the same names as the real client, so `vi.mock('./api', () => import('./__mocks__/api'))` is all you need in tests. For (SWR/TSQ) templates, hook stubs come with shorthand helpers:

```ts
pet.queries.usePetById.mockSWR({ data: { id: 1, name: 'Rex' } });
pet.mutations.useAddPet.mockSWRMutation({ isMutating: false });
// TanStack Query equivalents: mockQuery() / mockMutation()
```

See the [Mocking guide](https://yhnavein.github.io/swaggie/guide/mocking) for full details.

---

## Using Swaggie Programmatically

You can also call Swaggie directly from Node.js/bun/deno/etc:

```javascript
import swaggie from 'swaggie';

swaggie
  .genCode({
    src: 'https://petstore3.swagger.io/api/v3/openapi.json',
    out: './api/petstore.ts',
  })
  .then(complete, error);

function complete(spec) {
  console.info('Service generation complete');
}

function error(e) {
  console.error(e.toString());
}
```

---

## What's Supported

| Supported                                                                      | Not Supported                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| OpenAPI 3.0, 3.1, 3.2                                                          | Swagger / OpenAPI 2.0                                |
| `allOf`, `oneOf`, `anyOf`, `$ref`, external $refs                              | `not` keyword                                        |
| Spec formats: JSON, YAML                                                       | Very complex query parameter structures              |
| Extensions: `x-position`, `x-name`, `x-enumNames`, `x-enum-varnames`, `x-ts-type` | Multiple response types (only the first is used)  |
| Content types: JSON, plain text, multipart/form-data                           | Multiple request body types (only the first is used) |
| Content types: `application/x-www-form-urlencoded`, `application/octet-stream` | OpenAPI callbacks and webhooks                       |
| Various enum definition styles, support for additionalProperties               |                                                      |
| Nullable types, path inheritance, JSDoc descriptions                           |                                                      |
| Remote URLs and local file paths as spec source                                |                                                      |
| Grouping by tags, graceful handling of duplicate operation IDs                 |                                                      |

---

## Used By

<div style="display: flex; gap: 1rem;">
<a href="https://www.britishcouncil.org"><img alt="British Council" src="./docs/public/used-in/bc-logo.png" /></a>
<a href="https://kpmg.com/"><img alt="KPMG" src="./docs/public/used-in/kpmg-logo.png" /></a>
<a href="https://klarna.com/"><img alt="Klarna" src="./docs/public/used-in/klarna-logo.png" /></a>
</div>
