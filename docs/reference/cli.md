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
| `--template` | `-t` | `string` | `axios` | Template to use. One of: `axios`, `fetch`, `xior`, `swr-axios`, `tsq-xior`, `ng1`, `ng2`, or a path to a custom template directory. |
| `--baseUrl` | `-b` | `string` | `""` | Default base URL baked into the generated client. |
| `--mode` | `-m` | `string` | `full` | Generation mode: `full` (client + schemas) or `schemas` (types only). |
| `--schemaStyle` | `-d` | `string` | `interface` | Schema object style: `interface` or `type`. |
| `--enumStyle` | — | `string` | `union` | Enum declaration style: `union` or `enum`. |
| `--dateFormat` | — | `string` | `Date` | TypeScript type for date fields: `Date` or `string`. |
| `--nullables` | — | `string` | `ignore` | Nullable handling: `ignore`, `include`, or `nullableAsOptional`. |
| `--preferAny` | — | `boolean` | `false` | Use `any` instead of `unknown` for untyped values. |
| `--skipDeprecated` | — | `boolean` | `false` | Exclude deprecated operations from the output. |
| `--servicePrefix` | — | `string` | `""` | Prefix for generated service (client object) names. |
| `--allowDots` | — | `boolean` | `true` | Use dot notation for nested object query params (`a.b=1` vs `a[b]=1`). |
| `--arrayFormat` | — | `string` | `repeat` | Array serialization in query strings: `indices`, `repeat`, or `brackets`. |
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

### Skip deprecated endpoints

```bash
swaggie -s ./spec.json -o ./client.ts --skipDeprecated
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
