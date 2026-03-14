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

| Result | `allowDots` | `arrayFormat` |
|---|---|---|
| `?a.b=1&c=2&c=3` | `true` | `repeat` (default) |
| `?a.b=1&c[]=2&c[]=3` | `true` | `brackets` |
| `?a.b=1&c[0]=2&c[1]=3` | `true` | `indices` |
| `?a[b]=1&c=2&c=3` | `false` | `repeat` |
| `?a[b]=1&c[]=2&c[]=3` | `false` | `brackets` |
| `?a[b]=1&c[0]=2&c[1]=3` | `false` | `indices` |

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

## Nullable Strategy

OpenAPI 3.0 allows marking a field as `nullable: true`. Swaggie gives you three ways to represent this in the generated TypeScript via the `nullableStrategy` option.

| Value | Behavior |
|---|---|
| `"ignore"` *(default)* | `nullable` is ignored — field is typed as non-nullable |
| `"include"` | Appends `\| null` to the type |
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

| Value | Output |
|---|---|
| `"full"` *(default)* | Client methods + TypeScript schemas for all referenced types |
| `"schemas"` | TypeScript schemas only — all `components/schemas`, no client methods |

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

| Value | Output |
|---|---|
| `"interface"` *(default)* | `export interface Pet { ... }` |
| `"type"` | `export type Pet = { ... };` |

**When to prefer `"type"`:** Some teams enforce `type` over `interface` via linting rules. Functionally they are nearly identical for plain objects.

```json
{ "schemaDeclarationStyle": "type" }
```

---

## Enum Declaration Style

Use `enumDeclarationStyle` (or `--enumStyle` CLI flag) to control how plain string enums are declared.

| Value | Output |
|---|---|
| `"union"` *(default)* | `export type Status = 'active' \| 'disabled';` |
| `"enum"` | `export enum Status { active = 'active', disabled = 'disabled' }` |

::: info
This setting applies only to **plain string enums**. Numeric enums and mixed-type enums are always emitted as union types.
:::

**When to prefer `"enum"`:** TypeScript `enum` values are usable as values at runtime (e.g., `Status.active`), while union types are type-level only. Use `"enum"` if you want to reference enum members in your code without hardcoding string literals.

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

| Value | Effect |
|---|---|
| `"ignore"` | Parameter is removed from all generated method signatures |
| `"optional"` | Parameter becomes optional (`?`) everywhere it appears |
| `"required"` | Parameter is always required, regardless of what the spec says |

**Common use case:** Your backend requires a `tenantId` header on every request, handled globally by your Axios interceptor. Mark it as `"ignore"` so it doesn't show up in every generated method signature.

---

## Date Format

Use `dateFormat` to control the TypeScript type for `format: date` and `format: date-time` fields.

| Value | Output |
|---|---|
| `"Date"` *(default)* | `createdAt: Date` |
| `"string"` | `createdAt: string` |

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
