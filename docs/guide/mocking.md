# Mocking

Swaggie can generate a companion mock file alongside your API client. It exports typed spy stubs for every client method and hook — always in sync with your spec, zero manual maintenance.

## Setup

Add `mocks` and `testingFramework` to your config file:

```json
{
  "src": "./openapi.json",
  "out": "./src/api/client.ts",
  "template": ["swr", "axios"],
  "mocks": "./src/__mocks__/api.ts",
  "testingFramework": "vitest"
}
```

Or pass the flags on the CLI:

```bash
swaggie -s ./openapi.json -o ./src/api/client.ts -t swr,axios \
  --mocks ./src/__mocks__/api.ts --testingFramework vitest
```

Both `--mocks` and `--testingFramework` must be provided together, and `--out` is required because the mock file imports from the real client (Swaggie computes the relative path automatically).

::: info Supported frameworks
`"vitest"` — uses `vi.fn()` from `vitest`

`"jest"` — uses `jest.fn()` from `@jest/globals`
:::

## What gets generated

The mock file exports the same names as the real client. For an `["swr", "axios"]` template the output looks like:

```ts
import { vi } from 'vitest';
import * as realApi from './client';

// ── Helper functions ──────────────────────────────────────────────────────────

function withMockSWR(spy) { ... }
function withMockSWRMutation(spy) { ... }

// ── petClient — typed vi.fn() stubs for every method ─────────────────────────

export const petClient = {
  addPet:     vi.fn(),
  getPetById: vi.fn(),
  deletePet:  vi.fn(),
  // ...
};

// ── pet — hook stubs for queries and mutations ────────────────────────────────

export const pet = {
  queries: {
    usePetById:          withMockSWR(vi.fn()),
    useFindPetsByStatus: withMockSWR(vi.fn()),
  },
  mutations: {
    useAddPet:    withMockSWRMutation(vi.fn()),
    useDeletePet: withMockSWRMutation(vi.fn()),
  },
  // queryKeys are pure functions — re-exported from the real client, not mocked
  queryKeys: realApi.pet.queryKeys,
};
```

For TanStack Query (`tsq`) the helpers are `withMockQuery` / `withMockMutation` and the `mockQuery()` / `mockMutation()` shorthands are used instead.

For plain L1-only templates (`axios`, `fetch`, `xior`) only the `*Client` stubs are generated — no hook layer.

## Using the mock in tests

The generated mock exports the same names as the real client, so a single `vi.mock` call replaces the entire module:

```ts
vi.mock('./client', () => import('./__mocks__/api'));
```

From there, use the stubs directly — no extra setup needed.

### Testing a component that uses a query hook (SWR)

```tsx
// PetDetail.tsx
import { pet } from './client';

export function PetDetail({ petId }: { petId: number }) {
  const { data, isLoading } = pet.queries.usePetById(petId);
  if (isLoading) return <p>Loading…</p>;
  return <h1>{data?.name}</h1>;
}
```

```ts
// PetDetail.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { pet } from './__mocks__/api';

vi.mock('./client', () => import('./__mocks__/api'));

describe('PetDetail', () => {
  it('shows loading state', () => {
    vi.mocked(pet.queries.usePetById).mockSWR({ isLoading: true });
    render(<PetDetail petId={1} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders the pet name', () => {
    vi.mocked(pet.queries.usePetById).mockSWR({ data: { id: 1, name: 'Rex', photoUrls: [] } });
    render(<PetDetail petId={1} />);
    expect(screen.getByText('Rex')).toBeTruthy();
  });
});
```

### Testing a service that calls a plain client method

```ts
// petService.ts
import { petClient } from './client';

export async function savePet(pet: Pet) {
  const response = await petClient.addPet(pet);
  return response.data;
}
```

```ts
// petService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { petClient } from './__mocks__/api';

vi.mock('./client', () => import('./__mocks__/api'));

describe('savePet', () => {
  it('returns the created pet', async () => {
    vi.mocked(petClient.addPet).mockResolvedValue({
      data: { id: 42, name: 'Buddy', photoUrls: [] },
      status: 200, statusText: 'OK', headers: {}, config: {} as any,
    });

    const result = await savePet({ name: 'Buddy', photoUrls: [] });
    expect(result.name).toBe('Buddy');
    expect(petClient.addPet).toHaveBeenCalledOnce();
  });
});
```

## The mock shorthand helpers

### SWR — `mockSWR` and `mockSWRMutation`

Every query hook stub (`withMockSWR`) is augmented with a `mockSWR` shorthand that sets the return value to the shape SWR exposes:

```ts
// Long form (standard Vitest)
vi.mocked(pet.queries.usePetById).mockReturnValue({
  data: myPet,
  isLoading: false,
  error: null,
  mutate: vi.fn(),
});

// Short form (generated helper)
vi.mocked(pet.queries.usePetById).mockSWR({ data: myPet });
```

`mockSWR` accepts `{ data?, isLoading?, error? }`. All fields are optional — omitted fields use sensible defaults (`isLoading: false`, `error: null`).

Mutation hook stubs (`withMockSWRMutation`) have a `mockSWRMutation` shorthand matching the shape of `useSWRMutation`:

```ts
vi.mocked(pet.mutations.useAddPet).mockSWRMutation({ isMutating: true });
// → { trigger: vi.fn(), isMutating: true, error: null, data: undefined }
```

### TanStack Query — `mockQuery` and `mockMutation`

Query stubs are augmented with `mockQuery`:

```ts
vi.mocked(pet.queries.usePetById).mockQuery({ data: myPet });
// → { data: myPet, isLoading: false, isPending: false, isFetching: false,
//     isSuccess: true, error: null, refetch: vi.fn(), status: 'success' }

vi.mocked(pet.queries.usePetById).mockQuery({ isLoading: true });
// → { data: undefined, isLoading: true, isPending: true, ..., status: 'pending' }
```

Mutation stubs are augmented with `mockMutation`:

```ts
vi.mocked(pet.mutations.useAddPet).mockMutation({ isPending: true });
// → { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: true,
//     isSuccess: false, error: null, data: undefined, reset: vi.fn() }
```

## `queryKeys` passthrough

`queryKeys` functions are pure — they just build cache key strings or tuples from parameters. The mock re-exports them directly from the real client rather than stubbing them:

```ts
// In the generated mock:
queryKeys: realApi.pet.queryKeys,
```

This means `pet.queryKeys.petById(1)` returns the same value in tests as in production, so assertions on `refetch` calls or cache invalidation work without any extra setup.

## Keeping mocks up to date

Re-run Swaggie whenever your spec changes. Since mock names are derived directly from operation IDs, any endpoint added, removed, or renamed will be reflected in the next generated mock automatically. If a method disappears from the real client, TypeScript will report an error wherever you reference the old stub — the same compile-time guarantee the generated client gives you.
