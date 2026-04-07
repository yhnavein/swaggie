# Advanced Options

This page covers the more specialized configuration options for fine-tuning how Swaggie generates code.

## Query Parameter Serialization

Different backend frameworks expect query parameters in different formats. Swaggie gives you full control via the `queryParamsSerialization` config block. The defaults match what **ASP.NET Core** expects.

### `allowDots`

**Default:** `true`

Controls whether nested objects are serialized using dot notation or bracket notation.

### `arrayFormat`

**Default:** `"repeat"`

Controls how arrays are serialized in the query string.

### Serialization matrix

Given the object `{ "a": { "b": 1 }, "c": [2, 3] }`:

| Result                  | `allowDots` | `arrayFormat`      |
| ----------------------- | ----------- | ------------------ |
| `?a.b=1&c=2&c=3`        | `true`      | `repeat` (default) |
| `?a.b=1&c[]=2&c[]=3`    | `true`      | `brackets`         |
| `?a.b=1&c[0]=2&c[1]=3`  | `true`      | `indices`          |
| `?a[b]=1&c=2&c=3`       | `false`     | `repeat`           |
| `?a[b]=1&c[]=2&c[]=3`   | `false`     | `brackets`         |
| `?a[b]=1&c[0]=2&c[1]=3` | `false`     | `indices`          |

Once you know what your backend expects, set it in your config:

```json
{
  "queryParamsSerialization": {
    "allowDots": true,
    "arrayFormat": "repeat"
  }
}
```

Or via CLI flags:

```bash
swaggie -s ./spec.json -o ./client.ts --allowDots --arrayFormat repeat
```

---

## Query Parameter Grouping

**Option:** `queryParamsSerialization.queryParamsAsObject` (CLI: `--queryParamsAsObject`)

When an operation has many query parameters, individual function arguments can get unwieldy. This option groups all query parameters into a single typed object argument instead.

**Without grouping (default):**

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

**With `queryParamsAsObject: true`:**

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

### Values

| Value | Behavior |
|---|---|
| `true` | Always group all query parameters into an object |
| `N` (number) | Group only when the operation has more than `N` query parameters |
| `false` / omitted | Never group — each query parameter is a separate argument (default) |

The threshold form is useful when you want short operations to keep their flat signatures while longer ones get the cleaner object form:

```json
{
  "queryParamsSerialization": {
    "queryParamsAsObject": 3
  }
}
```

This will leave operations with 3 or fewer query parameters unchanged and group operations with 4 or more.

### CLI

```bash
# Always group
swaggie -s ./spec.json -o ./client.ts --queryParamsAsObject

# Group only when there are more than 3 query params
swaggie -s ./spec.json -o ./client.ts --queryParamsAsObject 3
```

---

## Nullable Strategy

OpenAPI 3.0 allows marking a field as `nullable: true`. Swaggie gives you three ways to represent this in the generated TypeScript via the `nullableStrategy` option.

| Value                  | Behavior                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `"ignore"` _(default)_ | `nullable` is ignored — field is typed as non-nullable     |
| `"include"`            | Appends `\| null` to the type                              |
| `"nullableAsOptional"` | Makes the field optional (`?`) instead of adding `\| null` |

**Example** — given this schema:

```yaml
tenant:
  type: string
  nullable: true
```

The output varies by strategy:

```typescript
// nullableStrategy: "ignore"             →  tenant: string;
// nullableStrategy: "include"            →  tenant: string | null;
// nullableStrategy: "nullableAsOptional" →  tenant?: string;
```

**Recommendation:** `"include"` is the most semantically correct. `"nullableAsOptional"` is useful when consuming APIs that over-use nullable as a way to express "this field might not be present".

---

## Generation Mode

Use the `generationMode` option (or `--mode` CLI flag) to control the scope of what gets generated.

| Value                | Output                                                                |
| -------------------- | --------------------------------------------------------------------- |
| `"full"` _(default)_ | Client methods + TypeScript schemas for all referenced types          |
| `"schemas"`          | TypeScript schemas only — all `components/schemas`, no client methods |

`"schemas"` mode is useful when:

- You only need types for form validation
- You're generating a shared types package
- You want to use Swaggie alongside a different code generation tool for the client code

```bash
# Generate only types
swaggie -s ./spec.json -o ./src/types.ts --mode schemas
```

---

## Schema Declaration Style

Use `schemaDeclarationStyle` (or `--schemaStyle` CLI flag) to control how object schemas are declared.

| Value                     | Output                         |
| ------------------------- | ------------------------------ |
| `"interface"` _(default)_ | `export interface Pet { ... }` |
| `"type"`                  | `export type Pet = { ... };`   |

**When to prefer `"type"`:** Some teams enforce `type` over `interface` via linting rules. Functionally they are nearly identical for plain objects.

```json
{ "schemaDeclarationStyle": "type" }
```

---

## Enum Declaration Style

Use `enumDeclarationStyle` (or `--enumStyle` CLI flag) to control how plain string enums are declared.

| Value                 | Output                                                            |
| --------------------- | ----------------------------------------------------------------- |
| `"union"` _(default)_ | `export type Status = 'active' \| 'disabled';`                    |
| `"enum"`              | `export enum Status { active = 'active', disabled = 'disabled' }` |

::: info
This setting applies only to **plain string enums**. Numeric enums and mixed-type enums are always emitted as union types.
:::

**When to prefer `"enum"`:** TypeScript `enum` values are usable as values at runtime (e.g., `Status.active`), while union types are type-level only. Use `"enum"` if you want to reference enum members in your code without hardcoding string literals.

---

## Enum Names Style

Use `enumNamesStyle` (or `--enumNamesStyle` CLI flag) to control how enum **member names** are formatted when generating TypeScript `enum` declarations.

This option only takes effect when `enumDeclarationStyle` is set to `"enum"`. It does not affect union types (which have no member names) or enums that use explicit custom names via `x-enumNames`/`x-enum-varnames`.

| Value                    | Output                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| `"original"` _(default)_ | `export enum Status { active = 'active', 'not active' = 'not active' }` |
| `"PascalCase"`           | `export enum Status { Active = 'active', NotActive = 'not active' }`    |

Enum **values** are never modified — only the member names are transformed. Values with spaces, hyphens, dots, and underscores are split and recombined into PascalCase: `"org-name"` becomes `OrgName`, `"some.thing"` becomes `SomeThing`.

```json
{
  "enumDeclarationStyle": "enum",
  "enumNamesStyle": "PascalCase"
}
```

::: tip
The CLI accepts both `PascalCase` and `pascal` as equivalent values: `--enumNamesStyle pascal`.
:::

---

## Parameter Modifiers

Sometimes an API spec marks a parameter as required, but in your client it's handled by an interceptor and you don't want it in every method signature. Parameter modifiers let you override this without touching the spec.

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

The key is the parameter name as it appears in the spec. The value is one of:

| Value        | Effect                                                         |
| ------------ | -------------------------------------------------------------- |
| `"ignore"`   | Parameter is removed from all generated method signatures      |
| `"optional"` | Parameter becomes optional (`?`) everywhere it appears         |
| `"required"` | Parameter is always required, regardless of what the spec says |

**Common use case:** Your backend requires a `tenantId` header on every request, handled globally by your Axios interceptor. Mark it as `"ignore"` so it doesn't show up in every generated method signature.

---

## Date Format

Use `dateFormat` to control the TypeScript type for `format: date` and `format: date-time` fields.

| Value                | Output              |
| -------------------- | ------------------- |
| `"Date"` _(default)_ | `createdAt: Date`   |
| `"string"`           | `createdAt: string` |

Use `"string"` when you serialize/deserialize dates manually or when your runtime doesn't parse ISO strings into `Date` objects automatically.

---

## Prefer `any` Over `unknown`

**Option:** `preferAny` (boolean, default `false`)

When `true`, untyped or free-form values use `any` instead of `unknown`. This is less type-safe but can be useful when migrating a large codebase where `unknown` would require extensive narrowing.

---

## Skip Deprecated Operations

**Option:** `skipDeprecated` (boolean, default `false`)

When `true`, any operation marked `deprecated: true` in the spec is excluded from the generated output. Useful for keeping the generated client clean as you phase out old API endpoints.

---

## Service Name Prefix

**Option:** `servicePrefix` (string, default `""`)

Prepends a string to every generated service (client object) name. Useful when generating clients for multiple APIs in the same project.

```json
{ "servicePrefix": "Petstore" }
```

With `servicePrefix: "Petstore"`, the generated `petClient` becomes `PetstorePetClient`, the `storeClient` becomes `PetstoreStoreClient`, etc.

---

## `x-ts-type` Extension

OpenAPI's type system covers the vast majority of real-world schemas, but occasionally you need a TypeScript type that simply cannot be expressed in OpenAPI — intersection types, complex mapped types, conditional types, and so on. The `x-ts-type` extension is an escape hatch for exactly these cases.

### How it works

Add an `x-ts-type` field to any schema in your spec. When Swaggie encounters it, the value is emitted **verbatim** as the TypeScript type, bypassing all normal schema derivation. The result is a plain type alias:

```typescript
export type YourSchemaName = <whatever you wrote in x-ts-type>;
```

`x-ts-type` takes precedence over **everything else** in the schema — including `$ref`, `type`, `properties`, `allOf`, and so on. Any other fields you leave on the schema are ignored by the generator (but remain useful for documentation and validation tooling).

### When to use it

The most common case is an **intersection type with `additionalProperties`**. For example, an API that returns a fixed set of typed fields _plus_ an open-ended set of extra keys cannot be cleanly described in OpenAPI 3.0. With `x-ts-type` you can write the exact TypeScript you need and keep the OpenAPI schema for docs and server-side validation:

```yaml
components:
  schemas:
    ProductAccess:
      x-ts-type: >-
        { products?: { [key: string]: AccessItem } } & { [key: string]: boolean | AccessItem | undefined }
      # The fields below are ignored by Swaggie but used by validators and docs tools
      type: object
      properties:
        products:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/AccessItem'
      additionalProperties:
        type: boolean
```

Swaggie generates:

```typescript
export type ProductAccess = { products?: { [key: string]: AccessItem } } & {
  [key: string]: boolean | AccessItem | undefined;
};
```

### More examples

**Simple union not expressible in OpenAPI:**

```yaml
StringOrNumber:
  x-ts-type: string | number
```

```typescript
export type StringOrNumber = string | number;
```

::: warning Keep the rest of the schema for tooling
Even though Swaggie ignores the other schema fields when `x-ts-type` is present, it is a good practice to keep them accurate. Documentation generators, server-side validators, and mock servers all read the same spec and benefit from a well-formed schema.
:::

---

## Code Formatting

Swaggie's output is functional but its whitespace may not match your project's style. Run the output through a formatter to normalize it.

### Prettier

```bash
# Format after generation
swaggie -c swaggie.config.json && prettier ./src/api/client.ts --write

# Or as an npm script
"gen:api": "swaggie -c swaggie.config.json && prettier ./src/api/client.ts --write"
```

### Biome

```bash
swaggie -c swaggie.config.json && biome check ./src/api/client.ts --write
```

Both tools need to be installed and configured separately for your project.
