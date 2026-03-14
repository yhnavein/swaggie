# Getting Started

Swaggie generates a fully typed TypeScript API client from an OpenAPI 3 specification. Instead of writing fetch calls by hand, you run Swaggie once (or as part of your CI pipeline) and get a single output file ready to import in your app.

## Prerequisites

- **Node.js 18.18+** (or Bun / Deno equivalent)
- An **OpenAPI 3.0, 3.1, or 3.2** specification — as a URL or a local `.json`/`.yaml` file

::: warning OpenAPI version support
Swaggie supports **OpenAPI 3.0 and newer only**. OpenAPI 2.0 (Swagger) specs are not supported.

If your backend still exposes a 2.0 spec, you can convert it using [swagger2openapi](https://www.npmjs.com/package/swagger2openapi) or update your backend to emit 3.0+.
:::

## Installation

Install Swaggie as a dev dependency (recommended):

```bash
npm install swaggie --save-dev
# or
yarn add swaggie --dev
# or
bun add swaggie --dev
```

Or install it globally if you prefer running it as a standalone CLI:

```bash
npm install swaggie -g
```

## Your first client in 60 seconds

Point Swaggie at any OpenAPI 3 spec and give it an output path:

```bash
npx swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./src/api/petstore.ts
```

That's it. Swaggie will fetch the spec, parse every endpoint, and write a typed TypeScript client to `./src/api/petstore.ts`.

The generated file looks like this:

```typescript
// ./src/api/petstore.ts  (excerpt)

import Axios, { AxiosPromise } from 'axios';

const axios = Axios.create({
  baseURL: '',
  paramsSerializer: (params) =>
    encodeParams(params, null, { allowDots: true, arrayFormat: 'repeat' }),
});

export const petClient = {
  /**
   * Find pet by ID
   * @param petId - ID of pet to return
   */
  getPetById(petId: number): AxiosPromise<Pet> {
    const url = `/pet/${encodeURIComponent(`${petId}`)}`;
    return axios.request<Pet>({ url, method: 'GET' });
  },

  // ...more methods
};

export interface Pet {
  id?: number;
  name: string;
  status?: 'available' | 'pending' | 'sold';
}
```

You can then use it anywhere in your app:

```typescript
import { petClient } from './src/api/petstore';

const response = await petClient.getPetById(42);
console.log(response.data.name);
```

If the API removes or renames an endpoint, re-running Swaggie produces a **compile-time error** — not a runtime surprise for your users.

## Formatting the output

Swaggie's templating engine produces functional TypeScript, but the whitespace isn't always perfect. Pipe the output through a formatter as part of your workflow:

```bash
# Prettier
npx swaggie -s $SPEC_URL -o ./src/api/client.ts && prettier ./src/api/client.ts --write

# Biome
npx swaggie -s $SPEC_URL -o ./src/api/client.ts && biome check ./src/api/client.ts --write
```

## Adding it to your package.json

For repeated use, add a script so your team can regenerate the client consistently:

```json
{
  "scripts": {
    "gen:api": "swaggie -c swaggie.config.json && prettier ./src/api/client.ts --write"
  }
}
```

Then run `npm run gen:api` whenever your API spec changes.

## Next steps

- [Configuration file](/guide/configuration) — manage all options in a JSON config with editor autocompletion
- [Templates](/guide/templates) — choose the right HTTP client (fetch, axios, xior, SWR, TanStack Query, Angular)
- [Advanced options](/guide/advanced) — nullable strategies, enum styles, query param serialization, and more
- [Programmatic API](/guide/programmatic) — run Swaggie from Node.js or in the browser
