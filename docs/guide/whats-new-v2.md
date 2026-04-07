# What's New in v2

Swaggie 2.0 is a major release built around three goals: **composability** (mix and match any HTTP client with any reactive layer), **completeness** (full mutation support, not just queries), and **test ergonomics** (auto-generated typed mock files). It also adds quality-of-life improvements for Next.js App Router users and APIs with large numbers of query parameters.

## Overview & breaking changes

::: warning Breaking changes from v1

**Template names `swr-axios` and `tsq-xior` have been removed.**

These monolithic combined templates are replaced by a composable pair syntax. Migrate as follows:

| v1 template | v2 equivalent |
|---|---|
| `"swr-axios"` | `["swr", "axios"]` |
| `"tsq-xior"` | `["tsq", "xior"]` |

In a config file:

```json
{ "template": ["swr", "axios"] }
```

On the CLI:

```bash
swaggie -s ./spec.json -o ./client.ts -t swr,axios
```

**Reactive template output shape has changed.**

Both `swr` and `tsq` templates now produce `queries`, `mutations`, and `queryKeys` namespaces per tag group. Previously only queries were generated. If you are importing from the generated file by name, you will need to update those imports.

**Most templates have received output improvements.**

`axios`, `fetch`, `xior`, and `ng2` templates have been updated and the generated output may differ slightly from v1.
:::

The sections below explain each new capability in detail.

---

## Composable template system

Previously, using SWR with axios required a dedicated `swr-axios` template; using TanStack Query with xior required `tsq-xior`. Adding a new combination (say, SWR with the native `fetch` API) meant shipping a whole new template.

In v2, HTTP client templates and reactive query layer templates are independent. You pick one from each group and Swaggie composes them at generation time.

**HTTP client templates** — produce a plain typed client object:

| Template | HTTP library |
|---|---|
| `axios` | [Axios](https://axios-http.com) |
| `fetch` | Native `fetch` (no extra dependencies) |
| `xior` | [xior](https://github.com/suhaotian/xior) — lightweight Axios-compatible |
| `ng1` | Angular 1 `$http` |
| `ng2` | Angular `HttpClient` |

**Reactive query layer templates** — wrap any compatible HTTP client with hooks:

| Template | Library |
|---|---|
| `swr` | [SWR](https://swr.vercel.app) |
| `tsq` | [TanStack Query](https://tanstack.com/query) |

Pair them with a 2-element array in your config or a comma-separated value on the CLI:

```json
{ "template": ["swr", "axios"] }
{ "template": ["tsq", "xior"] }
{ "template": ["swr", "fetch"] }
```

```bash
swaggie -s ./spec.json -o ./client.ts -t swr,axios
swaggie -s ./spec.json -o ./client.ts -t tsq,xior
swaggie -s ./spec.json -o ./client.ts -t swr,fetch
```

If you pass only a reactive layer name, Swaggie defaults to `fetch` as the HTTP client:

```json
{ "template": "swr" }
```

This is equivalent to `["swr", "fetch"]`.

See [Templates](/guide/templates) for the full compatibility matrix and generated output examples.

---

## Auto-generated mutations

In v1, reactive templates only generated hooks for GET operations (queries). Non-GET operations (POST, PUT, PATCH, DELETE) had to be called through the plain client object.

In v2, every non-GET operation automatically gets a typed mutation hook alongside the plain client method. For `swr` this uses `useSWRMutation`; for `tsq` this uses `useMutation`.

**Generated output (excerpt for `["swr", "axios"]`):**

```typescript
export const pet = {
  queries: {
    useGetPetById(petId: number, config?: SwrConfig) {
      return useSWR<Pet>(pet.queryKeys.getPetById(petId), () =>
        petClient.getPetById(petId).then((r) => r.data)
      );
    },
    // ...one hook per GET operation
  },
  mutations: {
    useAddPet(config?: SWRMutationConfiguration<Pet, Error, string, { body: Pet }>) {
      return useSWRMutation('/pet', (_key, { arg }) =>
        petClient.addPet(arg.body).then((r) => r.data)
      );
    },
    useDeletePet(config?: SWRMutationConfiguration<void, Error, string, { petId: number }>) {
      return useSWRMutation('/pet', (_key, { arg }) =>
        petClient.deletePet(arg.petId).then((r) => r.data)
      );
    },
    // ...one hook per non-GET operation
  },
  queryKeys: {
    getPetById: (petId: number) => `/pet/${petId}`,
  },
};
```

Both `swr` and `tsq` follow this shape. The TanStack Query variant uses `useQuery` / `useMutation` internally.

---

## Query parameter grouping

**New option:** `queryParamsSerialization.queryParamsAsObject`

When an operation has many query parameters, keeping them as individual function arguments can get unwieldy. This option groups all query parameters into a single typed object argument instead.

**Before (without the option):**

```typescript
getPets(
  status?: 'available' | 'pending' | 'sold',
  minAge?: number,
  maxAge?: number,
  breed?: string,
  sortBy?: string,
  sortDir?: 'asc' | 'desc',
): AxiosPromise<Pet[]>
```

**After (with `queryParamsAsObject: true`):**

```typescript
getPets(query?: {
  status?: 'available' | 'pending' | 'sold';
  minAge?: number;
  maxAge?: number;
  breed?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): AxiosPromise<Pet[]>
```

Set it to `true` to always group, or to a number to group only when the query parameter count exceeds that threshold:

```json
{
  "queryParamsSerialization": {
    "queryParamsAsObject": true
  }
}
```

```json
{
  "queryParamsSerialization": {
    "queryParamsAsObject": 3
  }
}
```

```bash
# Always group
swaggie -s ./spec.json -o ./client.ts --queryParamsAsObject

# Group only when there are more than 3 query params
swaggie -s ./spec.json -o ./client.ts --queryParamsAsObject 3
```

See [Query Parameter Grouping](/guide/advanced#query-parameter-grouping) in the Advanced Options guide for full details.

---

## Next.js App Router support

**New option:** `useClient` / `--useClient` / `-C`

SWR and TanStack Query hooks can only run inside React Client Components. In the Next.js App Router, that means the generated file needs a `'use client';` directive at the top.

Use the new `useClient` flag to have Swaggie add it automatically:

```bash
swaggie -s ./spec.json -o ./src/api/client.ts -t swr,axios --useClient
swaggie -s ./spec.json -o ./src/api/client.ts -t tsq,fetch -C
```

In a config file:

```json
{
  "src": "./spec.json",
  "out": "./src/api/client.ts",
  "template": ["swr", "axios"],
  "useClient": true
}
```

This flag has no effect and should not be used outside of Next.js App Router (RSC) environments.

---

## Auto-generated mocks <Badge type="warning" text="Beta" />

::: warning Beta feature
Mock generation is a beta feature. The generated output shape and the shorthand helper API may change in a future release. Feedback and bug reports are very welcome — please [open an issue on GitHub](https://github.com/yhnavein/swaggie/issues).
:::

**New options:** `mocks` + `testingFramework`

Swaggie can now generate a companion mock file alongside your API client. It exports typed spy stubs for every client method and hook — always in sync with your spec, zero manual maintenance.

```bash
swaggie -s ./spec.json -o ./src/api/client.ts -t swr,axios \
  --mocks ./src/__mocks__/api.ts --testingFramework vitest
```

```json
{
  "src": "./spec.json",
  "out": "./src/api/client.ts",
  "template": ["swr", "axios"],
  "mocks": "./src/__mocks__/api.ts",
  "testingFramework": "vitest"
}
```

Both `vitest` and `jest` are supported.

### What gets generated

The mock file exports the same names as the real client. A single `vi.mock` call replaces the entire module in tests:

```ts
vi.mock('./client', () => import('./__mocks__/api'));
```

For reactive layer templates (`swr`, `tsq`), hook stubs come with ergonomic shorthand helpers so you don't have to spell out the full return shape in every test:

**SWR:**

```ts
// Query hook stubs
vi.mocked(pet.queries.useGetPetById).mockSWR({ data: myPet });
vi.mocked(pet.queries.useGetPetById).mockSWR({ isLoading: true });

// Mutation hook stubs
vi.mocked(pet.mutations.useAddPet).mockSWRMutation({ isMutating: true });
```

**TanStack Query:**

```ts
vi.mocked(pet.queries.useGetPetById).mockQuery({ data: myPet });
vi.mocked(pet.mutations.useAddPet).mockMutation({ isPending: true });
```

`queryKeys` functions are pure — they are re-exported from the real client rather than stubbed, so cache key assertions work the same in tests as in production.

For plain HTTP client templates (`axios`, `fetch`, `xior`) only the `*Client` stubs are generated — no hook layer.

See the [Mocking guide](/guide/mocking) for full usage examples and API reference.
