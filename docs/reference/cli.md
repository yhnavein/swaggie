# CLI Reference

Swaggie is invoked via the `swaggie` command. All options can be provided via flags or via a [configuration file](/guide/configuration).

## Synopsis

```bash
swaggie [options]
```

At minimum, you need either `--config` or `--src`:

```bash
# Using a config file
swaggie -c swaggie.config.json

# Using flags directly
swaggie -s <spec-url-or-path> -o <output-file>
```

## Options

| Flag | Alias | Type | Default | Description |
|---|---|---|---|---|
| `--config` | `-c` | `string` | — | Path to a JSON configuration file. Mutually exclusive with `--src`. |
| `--src` | `-s` | `string` | — | URL or file path to the OpenAPI spec (`.json` or `.yaml`). Required when not using `--config`. |
| `--out` | `-o` | `string` | — | Output file path. Omit to print generated code to stdout. |
| `--template` | `-t` | `string` | `axios` | Template to use. HTTP client templates: `axios`, `fetch`, `xior`, `ng1`, `ng2`. Reactive layer templates paired with an HTTP client using a comma-separated value: `swr,axios` / `tsq,xior` / `swr,fetch`, etc. A reactive layer name alone (e.g. `swr`) defaults to `fetch` as the HTTP client. A path to a custom template directory is also accepted. |
| `--baseUrl` | `-b` | `string` | `""` | Default base URL baked into the generated client. |
| `--mode` | `-m` | `string` | `full` | Generation mode: `full` (client + schemas) or `schemas` (types only). |
| `--schemaStyle` | `-d` | `string` | `interface` | Schema object style: `interface` or `type`. |
| `--enumStyle` | — | `string` | `union` | Enum declaration style: `union` or `enum`. |
| `--enumNamesStyle` | — | `string` | `original` | Enum member name formatting: `original`, `PascalCase`, or `pascal`. Only with `--enumStyle enum`. |
| `--dateFormat` | — | `string` | `Date` | TypeScript type for date fields: `Date` or `string`. |
| `--nullables` | — | `string` | `ignore` | Nullable handling: `ignore`, `include`, or `nullableAsOptional`. |
| `--preferAny` | — | `boolean` | `false` | Use `any` instead of `unknown` for untyped values. |
| `--skipDeprecated` | — | `boolean` | `false` | Exclude deprecated operations from the output. |
| `--servicePrefix` | — | `string` | `""` | Prefix for generated service (client object) names. |
| `--allowDots` | — | `boolean` | `true` | Use dot notation for nested object query params (`a.b=1` vs `a[b]=1`). |
| `--arrayFormat` | — | `string` | `repeat` | Array serialization in query strings: `indices`, `repeat`, or `brackets`. |
| `--queryParamsAsObject` | — | `boolean \| number` | — | Group all query parameters into a single typed object argument. Pass without a value to always group, or pass a number `N` to group only when there are more than `N` query parameters. See [Query Parameter Grouping](/guide/advanced#query-parameter-grouping). |
| `--useClient` | `-C` | `boolean` | `false` | Prepend `'use client';` to the hooks file (when `--hooksOut` is set) or the main file (single-file mode). Required for [Next.js App Router](https://nextjs.org/docs/app) when using `swr` or `tsq` templates. Has no effect outside RSC environments. |
| `--hooksOut` | — | `string` | — | Output path for the generated hooks file (L2 templates only). When set, reactive hooks are written to this file and the main `--out` file contains only HTTP clients and types. See [Next.js split-file mode](/guide/configuration#hooksout). |
| `--mocks` | — | `string` | — | Output path for the generated mock/stub file. Requires `--testingFramework` and `--out`. See [Mocking](/guide/mocking). |
| `--testingFramework` | `-T` | `string` | — | Test framework for generated mock stubs: `vitest` or `jest`. Requires `--mocks` and `--out`. |
| `--version` | `-V` | — | — | Print the installed version number and exit. |
| `--help` | `-h` | — | — | Show the help message and exit. |

## Examples

### Minimal — output to stdout

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json
```

The generated TypeScript is printed to stdout. Useful for piping:

```bash
swaggie -s ./spec.json | prettier --parser typescript > ./src/api/client.ts
```

### Minimal — write to file

```bash
swaggie -s https://petstore3.swagger.io/api/v3/openapi.json -o ./src/api/client.ts
```

### With config file

```bash
swaggie -c swaggie.config.json
```

### Override config file options via flags

CLI flags take precedence over config file values. This lets you override specific settings at call time:

```bash
swaggie -c swaggie.config.json --template fetch --out ./src/api/client-fetch.ts
```

### Generate only TypeScript schemas

```bash
swaggie -s ./spec.json -o ./src/types.ts --mode schemas
```

### Use the `fetch` template with dot-notation query params

```bash
swaggie -s ./spec.json -o ./client.ts -t fetch --allowDots --arrayFormat repeat
```

### Use a reactive query layer with a specific HTTP client

Combine a reactive query layer template with an HTTP client template using a comma-separated pair:

```bash
# SWR hooks backed by axios
swaggie -s ./spec.json -o ./client.ts -t swr,axios

# TanStack Query hooks backed by xior
swaggie -s ./spec.json -o ./client.ts -t tsq,xior

# SWR hooks backed by the native fetch API
swaggie -s ./spec.json -o ./client.ts -t swr,fetch
```

### Skip deprecated endpoints

```bash
swaggie -s ./spec.json -o ./client.ts --skipDeprecated
```

### Next.js App Router (SWR or TanStack Query)

SWR and TanStack Query hooks can only run in Client Components. Use `--hooksOut` to split the generated output into two files — a server-safe clients file and a client-only hooks file — and `--useClient` (or `-C`) to add the `'use client';` directive to the hooks file:

```bash
# Split-file mode (recommended for Next.js App Router)
swaggie -s ./spec.json \
  -o ./src/api/client.ts \
  --hooksOut ./src/api/hooks.ts \
  -t swr,axios \
  --useClient

# Single-file mode (legacy — hooks and clients in one file)
swaggie -s ./spec.json -o ./src/api/client.ts -t swr,axios --useClient
```

Or in a config file (split-file mode):

```json
{
  "src": "./spec.json",
  "out": "./src/api/client.ts",
  "hooksOut": "./src/api/hooks.ts",
  "template": ["swr", "axios"],
  "useClient": true
}
```

## Piping to a formatter

Swaggie's output is functional but may not match your project's whitespace style. Pipe it through a formatter as part of your workflow:

```bash
# Prettier
swaggie -c swaggie.config.json && prettier ./src/api/client.ts --write

# Biome
swaggie -c swaggie.config.json && biome check ./src/api/client.ts --write
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error — invalid options, spec load failure, generation error |
