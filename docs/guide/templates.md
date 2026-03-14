# Templates

Swaggie ships with seven built-in templates covering the most common TypeScript HTTP client libraries. You can also provide a custom template directory if none of them fit your codebase.

## Built-in templates

| Template | HTTP Client | Best for |
|---|---|---|
| `axios` | [Axios](https://axios-http.com) | React, Vue, Node.js — the most widely used default |
| `fetch` | Native `fetch` | Browser apps with no extra dependencies |
| `xior` | [xior](https://github.com/suhaotian/xior) | Lightweight Axios-compatible alternative |
| `swr-axios` | SWR + Axios | React apps using [SWR](https://swr.vercel.app) for data fetching |
| `tsq-xior` | TanStack Query + xior | React apps using [TanStack Query](https://tanstack.com/query) |
| `ng1` | Angular 1 `$http` | Legacy Angular 1.x applications |
| `ng2` | Angular `HttpClient` | Angular 2+ applications (uses `InjectionToken`) |

### `axios` (default)

The default template. Generates client objects with methods that return `AxiosPromise<T>`. Includes a shared Axios instance configured with your `baseUrl` and query parameter serialization settings.

**Dependencies you need in your project:**

```bash
npm install axios
```

**Generated output (excerpt):**

```typescript
import Axios, { AxiosPromise } from 'axios';

const axios = Axios.create({ baseURL: '/api' });

export const petClient = {
  getPetById(petId: number): AxiosPromise<Pet> {
    return axios.request<Pet>({ url: `/pet/${petId}`, method: 'GET' });
  },
};
```

---

### `fetch`

Uses the native browser (or Node 18+) `fetch` API. No runtime dependencies required.

**Generated output (excerpt):**

```typescript
export const petClient = {
  async getPetById(petId: number): Promise<Pet> {
    const response = await fetch(`/api/pet/${petId}`);
    return response.json() as Promise<Pet>;
  },
};
```

---

### `xior`

[xior](https://github.com/suhaotian/xior) is a lightweight, modern alternative to Axios with a compatible API surface. Use this if you want Axios-style interceptors without the Axios bundle size.

**Dependencies:**

```bash
npm install xior
```

---

### `swr-axios`

Generates SWR hooks for `GET` operations and standard Axios methods for mutations (`POST`, `PUT`, `PATCH`, `DELETE`). Best for React apps that use [SWR](https://swr.vercel.app) for server state.

**Dependencies:**

```bash
npm install axios swr
```

**Generated output (excerpt):**

```typescript
import useSWR from 'swr';

export const petClient = {
  useGetPetById(petId: number) {
    return useSWR<Pet>(`/pet/${petId}`, fetcher);
  },

  addPet(body: Pet): AxiosPromise<Pet> {
    return axios.request<Pet>({ url: '/pet', method: 'POST', data: body });
  },
};
```

---

### `tsq-xior`

Generates [TanStack Query](https://tanstack.com/query) hooks for `GET` operations, backed by xior for the actual HTTP calls. Mutations use plain xior calls.

**Dependencies:**

```bash
npm install @tanstack/react-query xior
```

---

### `ng1`

Angular 1 template. Generates a service using `$http` and Angular 1 dependency injection.

---

### `ng2`

Angular 2+ template. Generates injectable services using `HttpClient` and `InjectionToken` for configuration. Requires `@angular/common/http`.

## Choosing the right template

- **No framework / Node.js backend** → `fetch` (zero deps) or `axios` (interceptors, retries)
- **React with SWR** → `swr-axios`
- **React with TanStack Query** → `tsq-xior`
- **Prefer minimal bundle size** → `xior` or `fetch`
- **Angular** → `ng2` (Angular 2+) or `ng1` (legacy)

## Custom templates

If none of the built-in templates fit your existing HTTP client setup, you can provide your own template directory:

```bash
swaggie -s ./openapi.json -o ./client.ts --template ./my-template/
```

Or in your config file:

```json
{
  "template": "./my-template/"
}
```

### Template directory structure

A custom template directory should contain EJS (`.ejs`) files. Swaggie will look for these files:

| File | Purpose |
|---|---|
| `baseClient.ejs` | Top of the output file — imports, shared HTTP client setup |
| `client.ejs` | One client object per tag group |
| `operation.ejs` | One method per API operation |
| `barrel.ejs` | Re-export barrel file (optional) |

### Available template variables

Inside each template, Swaggie provides the following variables:

**In `operation.ejs`:**

| Variable | Type | Description |
|---|---|---|
| `operation` | `IOperation` | Parsed operation data (method, path, params, responses) |
| `options` | `AppOptions` | Resolved generation options |

**In `client.ejs`:**

| Variable | Type | Description |
|---|---|---|
| `group` | `string` | Tag name for this client group |
| `operations` | `IOperation[]` | All operations belonging to this group |
| `options` | `AppOptions` | Resolved generation options |

**In `baseClient.ejs`:**

| Variable | Type | Description |
|---|---|---|
| `options` | `AppOptions` | Resolved generation options |
| `groups` | `string[]` | All tag group names |

The best way to get started with a custom template is to copy one of the [built-in templates](https://github.com/yhnavein/swaggie/tree/master/templates) and modify it for your needs.
