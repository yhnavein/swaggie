<div style="text-align: center; margin: 0px auto 30px; max-width: 600px">
  <img src="./swaggie.svg" alt="Swaggie logo">
</div>

# Swaggie

![npm latest version](https://img.shields.io/npm/v/swaggie)
![NodeCI](https://github.com/yhnavein/swaggie/workflows/NodeCI/badge.svg)
![Test Coverage](https://img.shields.io/badge/test_coverage-98%25-brightgreen)
![npm downloads](https://img.shields.io/npm/dw/swaggie.svg)
![npm install size](https://packagephobia.now.sh/badge?p=swaggie)

Swaggie generates TypeScript client code from an OpenAPI 3 specification. Instead of writing API-fetching code by hand, you point Swaggie at your API spec and it outputs a fully typed, ready-to-use client — helping you catch errors at compile time rather than at runtime.

See the [Example section](#example) for a quick demo.

> Inspired by [OpenApi Client](https://github.com/mikestead/openapi-client).

---

## Features

- Generates TypeScript code from OpenAPI 3.0, 3.1, and 3.2 specs
- Supports multiple HTTP client libraries out of the box: `fetch`, `axios`, `xior`, `SWR + axios`, `Angular 1`, `Angular 2+`, and `TanStack Query`
- Custom templates — bring your own to fit your existing codebase
- Supports `allOf`, `oneOf`, `anyOf`, `$ref`, nullable types, and various enum definitions
- Handles multiple content types: JSON, plain text, multipart/form-data, URL-encoded, and binary
- JSDoc comments on all generated functions
- Generates a single, small, tree-shakable output file
- Dev-only dependency — zero runtime overhead

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
-V, --version             Output the version number
-c, --config <path>       Path to a JSON configuration file
-s, --src <url|path>      URL or file path to the OpenAPI spec
-o, --out <filePath>      Output file path (omit to print to stdout)
-b, --baseUrl <string>    Default base URL for the generated client (default: "")
-t, --template <string>   Template to use for code generation (default: "axios")
    --preferAny           Use "any" instead of "unknown" for untyped values (default: false)
    --skipDeprecated      Exclude deprecated operations from the output (default: false)
    --servicePrefix       Prefix for service names — useful when generating multiple APIs
    --allowDots           Use dot notation to serialize nested object query params
    --arrayFormat         How arrays are serialized: "indices", "repeat", or "brackets"
-h, --help                Show help
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
  "queryParamsSerialization": {
    "arrayFormat": "repeat",
    "allowDots": true
  }
}
```

The `$schema` field enables autocompletion and inline documentation in most editors.

---

## Templates

Swaggie ships with the following built-in templates:

| Template    | Description                                                                               |
| ----------- | ----------------------------------------------------------------------------------------- |
| `axios`     | Default. Recommended for React, Vue, and similar frameworks                               |
| `xior`      | Lightweight modern alternative to axios ([xior](https://github.com/suhaotian/xior#intro)) |
| `swr-axios` | SWR hooks for GET requests, backed by axios                                               |
| `tsq-xior`  | TanStack Query hooks for GET requests, backed by xior                                     |
| `fetch`     | Uses the native browser Fetch API                                                         |
| `ng1`       | Angular 1 client                                                                          |
| `ng2`       | Angular 2+ client (uses HttpClient and InjectionTokens)                                   |

To use a custom template, pass the path to your template directory:

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./client/petstore.ts --template ./my-swaggie-template/
```

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
  paramsSerializer: (params) =>
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

## Server Setup Samples

Swaggie only needs a JSON or YAML OpenAPI spec file — it does not require a running server. However, if you want to see how to configure your backend to expose an OpenAPI spec automatically, check out the sample configurations in the `samples/` folder:

- [ASP.NET Core + NSwag](./samples/dotnetcore/nswag/README.md)
- [ASP.NET Core + Swashbuckle](./samples/dotnetcore/swashbuckle/README.md)

---

## What's Supported

| Supported                                                                      | Not Supported                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| OpenAPI 3.0, 3.1, 3.2                                                          | Swagger / OpenAPI 2.0                                |
| `allOf`, `oneOf`, `anyOf`, `$ref`                                              | `not` keyword                                        |
| Spec formats: JSON, YAML                                                       | Very complex query parameter structures              |
| Extensions: `x-position`, `x-name`, `x-enumNames`, `x-enum-varnames`           | Multiple response types (only the first is used)     |
| Content types: JSON, plain text, multipart/form-data                           | Multiple request body types (only the first is used) |
| Content types: `application/x-www-form-urlencoded`, `application/octet-stream` | References to external spec files                    |
| Various enum definition styles                                                 | OpenAPI callbacks and webhooks                       |
| Nullable types, path inheritance, JSDoc descriptions                           |                                                      |
| Remote URLs and local file paths as spec source                                |                                                      |
| Grouping by tags, graceful handling of duplicate operation IDs                 |                                                      |

---

## Used By

<div style="display: flex; gap: 1rem;">
<a href="https://www.britishcouncil.org"><img alt="British Council" src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/BritishCouncil.png/320px-BritishCouncil.png" style="height: 50px;" /></a>
<a href="https://kpmg.com/"><img alt="KPMG" src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/KPMG.svg/320px-KPMG.svg.png" style="height: 50px;" /></a>
<a href="https://klarna.com/"><img alt="Klarna" src="https://upload.wikimedia.org/wikipedia/commons/4/40/Klarna_Payment_Badge.svg" style="height: 50px;" /></a>
</div>
