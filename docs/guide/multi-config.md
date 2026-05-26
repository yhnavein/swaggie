# Multiple APIs in One Config

If your project consumes more than one API, you no longer need a separate config file and a separate `swaggie` invocation for each. A single config file can describe all of them.

## Basic setup

Instead of a root object, use a `configs` array — each entry is a full single-API config:

```json
{
  "$schema": "https://yhnavein.github.io/swaggie/schema.json",
  "configs": [
    {
      "src": "https://api.example.com/v1/openapi.json",
      "out": "./src/api/v1.ts"
    },
    {
      "src": "https://internal.example.com/openapi.yaml",
      "out": "./src/api/internal.ts",
      "template": "fetch"
    }
  ]
}
```

Run it the same way you always would:

```bash
swaggie -c swaggie.config.json
```

Swaggie processes entries **sequentially** and stops on the first error.

## Shared defaults

Any option that is the same across all entries can be moved to the top level of the config file. Each entry inherits it automatically.

```json
{
  "$schema": "https://yhnavein.github.io/swaggie/schema.json",
  "template": ["swr", "axios"],
  "useClient": true,
  "nullableStrategy": "include",
  "configs": [
    {
      "src": "https://api.example.com/nest/openapi.json",
      "out": "./src/api/nest.ts"
    },
    {
      "src": "https://api.example.com/v2/openapi.json",
      "out": "./src/api/v2.ts"
    }
  ]
}
```

Both entries are generated with `template: ["swr", "axios"]`, `useClient: true`, and `nullableStrategy: "include"`.

### Per-entry overrides

An entry can override any top-level default by simply setting the option locally:

```json
{
  "$schema": "https://yhnavein.github.io/swaggie/schema.json",
  "template": ["swr", "axios"],
  "useClient": true,
  "configs": [
    {
      "src": "https://api.example.com/nest/openapi.json",
      "out": "./src/api/nest.ts"
    },
    {
      "src": "https://api.example.com/legacy/openapi.json",
      "out": "./src/api/legacy.ts",
      "template": "axios"
    }
  ]
}
```

Priority order: **CLI flags > per-entry options > top-level defaults**.

## Restricted options

A handful of options are **not** allowed at the top level because they describe a specific output file, not a shared behaviour. Set them inside each entry:

| Option | Why it must be per-entry |
|---|---|
| `src` | Each entry has its own spec source |
| `out` | Each entry writes to its own output file |
| `hooksOut` | Hooks file path is specific to an entry's output |
| `mocks` | Mock file path is specific to an entry's output |
| `clientSetup` | Setup file path is specific to an entry |

Swaggie will throw a descriptive error if any of these appear at the top level of a multi-config file.
