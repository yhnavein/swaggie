# Templates

Swaggie's template system is split into two independent layers: **HTTP client templates** and **reactive query layer templates**. You can use an HTTP client template on its own, or combine a reactive layer template with any compatible HTTP client template to get a fully-typed reactive data-fetching layer on top.

## HTTP client templates

These are self-contained and produce a plain typed client with one method per API operation. Pick whichever library fits your project:

| Template | HTTP Client | Best for |
|---|---|---|
| `axios` | [Axios](https://axios-http.com) | React, Vue, Node.js — the most widely used default |
| `fetch` | Native `fetch` | Browser apps or Node 18+ with no extra dependencies |
| `xior` | [xior](https://github.com/suhaotian/xior) | Lightweight Axios-compatible alternative |
| `ng1` | Angular 1 `$http` | Legacy Angular 1.x applications |
| `ng2` | Angular `HttpClient` | Angular 2+ applications (uses `InjectionToken`) |

### `axios` (default)

Generates client objects with methods that return `AxiosPromise<T>`. Includes a shared Axios instance configured with your `baseUrl` and query parameter serialization settings.

**Dependencies:**

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

### `ng1` / `ng2`

Angular-specific clients. `ng1` uses `$http` and Angular 1 dependency injection. `ng2` generates injectable services using `HttpClient` and `InjectionToken`. Requires `@angular/common/http`.

> Angular clients are not compatible with reactive query layer templates.

---

## Reactive query layer templates

Reactive layer templates wrap an HTTP client template with a reactive data-fetching layer. They produce two exports per API group: the plain client object (identical to the standalone HTTP client template) and a hooks namespace with `queries`, `mutations`, and `queryKeys`.

| Template | Library | Best for |
|---|---|---|
| `swr` | [SWR](https://swr.vercel.app) | React apps using SWR for server state |
| `tsq` | [TanStack Query](https://tanstack.com/query) | React apps using TanStack Query |

Reactive layer templates must be composed with a compatible HTTP client template. The compatible HTTP client templates are: **`axios`**, **`fetch`**, **`xior`**.

---

## Combining templates

Pass the template as a **2-element array** with `[reactive-layer, http-client]` in your config, or as a **comma-separated pair** on the CLI.

### In a config file

```json
{
  "template": ["swr", "axios"]
}
```

### On the CLI

```bash
# reactive-layer,http-client — comma-separated
swaggie -s ./openapi.json -o ./client.ts -t swr,axios
swaggie -s ./openapi.json -o ./client.ts -t tsq,xior
swaggie -s ./openapi.json -o ./client.ts -t swr,fetch
swaggie -s ./openapi.json -o ./client.ts -t tsq,axios
```

### Reactive layer alone — defaults to `fetch`

If you pass only a reactive layer template name without a companion HTTP client template, Swaggie defaults to `fetch`:

```json
{ "template": "swr" }
```

This is equivalent to `["swr", "fetch"]`.

### Valid combinations

| Reactive layer | Compatible HTTP client templates |
|---|---|
| `swr` | `axios`, `fetch`, `xior` |
| `tsq` | `axios`, `fetch`, `xior` |

### Generated output (excerpt for `["swr", "axios"]`)

```typescript
import useSWR, { type SWRConfiguration, type Key } from 'swr';
import useSWRMutation, { type SWRMutationConfiguration } from 'swr/mutation';
import Axios, { type AxiosPromise, type AxiosRequestConfig } from 'axios';

const axios = Axios.create({ baseURL: '/api' });

// Plain HTTP client — identical to the plain axios template
export const petClient = {
  getPetById(petId: number): AxiosPromise<Pet> {
    return axios.request<Pet>({ url: `/pet/${petId}`, method: 'GET' });
  },
};

// SWR hook namespace
export const pet = {
  queries: {
    useGetPetById(petId: number, $config?: SwrConfig) {
      return useSWR<Pet>(pet.queryKeys.getPetById(petId), () =>
        petClient.getPetById(petId).then((r) => r.data)
      );
    },
  },
  mutations: {
    useAddPet($config?: SWRMutationConfiguration<Pet, Error, string, { body: Pet }>) {
      return useSWRMutation('/pet', (_key, { arg }) =>
        petClient.addPet(arg.body).then((r) => r.data)
      );
    },
  },
  queryKeys: {
    getPetById: (petId: number) => `/pet/${petId}`,
  },
};
```

**Dependencies for `["swr", "axios"]`:**

```bash
npm install axios swr
```

**Dependencies for `["tsq", "xior"]`:**

```bash
npm install xior @tanstack/react-query
```

---

## Choosing the right template

| Scenario | Template |
|---|---|
| No framework / Node.js backend | `fetch` (zero deps) or `axios` |
| React — prefer minimal bundle size | `xior` or `fetch` |
| React with SWR — backed by axios | `["swr", "axios"]` |
| React with SWR — minimal bundle | `["swr", "xior"]` or `["swr", "fetch"]` |
| React with TanStack Query | `["tsq", "xior"]` or `["tsq", "axios"]` |
| Angular 2+ | `ng2` |
| Angular 1 (legacy) | `ng1` |

---

## Custom templates

If none of the built-in templates fit your existing HTTP client setup, provide a path to your own template directory:

```bash
swaggie -s ./openapi.json -o ./client.ts --template ./my-template/
```

Or in your config file:

```json
{
  "template": "./my-template/"
}
```

Custom paths also work in composite pairs. For example, to use your own reactive layer on top of the built-in `axios` HTTP client template:

```json
{
  "template": ["./my-reactive-template/", "axios"]
}
```

### Template directory structure

A custom template directory should contain `.ejs` files. Swaggie renders these files at generation time:

| File | Purpose |
|---|---|
| `baseClient.ejs` | Top of the output file — imports and shared HTTP client setup |
| `client.ejs` | One client object per tag group |
| `operation.ejs` | One method per API operation |
| `barrel.ejs` | Shared helpers appended once at the bottom |

The best way to get started is to copy one of the [built-in templates](https://github.com/yhnavein/swaggie/tree/master/templates) and modify it for your needs.
