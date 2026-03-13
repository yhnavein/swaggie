# Programmatic API

Swaggie can be used directly from TypeScript or JavaScript code — useful for build scripts, custom CLI tooling, or running code generation inside a web app.

There are two separate entry points depending on your environment:

| Entry point | Environment | Config file | Writes to disk |
|---|---|---|---|
| `swaggie` | Node.js / Bun / Deno | Yes | Yes |
| `swaggie/browser` | Browser / any bundler | No | No |

---

## Node.js API (`swaggie`)

### `runCodeGenerator(options)`

The primary entry point. Loads the spec, resolves config, generates code, and optionally writes it to disk.

```typescript
import { runCodeGenerator } from 'swaggie';

const [code, resolvedOptions] = await runCodeGenerator({
  src: 'https://petstore3.swagger.io/api/v3/openapi.json',
  out: './src/api/petstore.ts',
  template: 'axios',
  baseUrl: '/api',
});

console.log('Generated', code.length, 'characters');
```

When `out` is provided, the file is written to disk and `code` contains the same content. Omit `out` to get the code string without writing a file.

**Parameters:** `Partial<FullAppOptions>` — see [Configuration](/guide/configuration) for all options. Either `src` or `config` must be provided.

**Returns:** `Promise<[string, AppOptions]>` — the generated code string and the fully resolved options used.

---

### `applyConfigFile(options)`

Loads a JSON config file and merges it with the provided options. CLI options take precedence over config file values.

```typescript
import { applyConfigFile } from 'swaggie';

const resolvedOptions = await applyConfigFile({
  config: './swaggie.config.json',
  // Any option here overrides the config file
  skipDeprecated: true,
});
```

**Returns:** `Promise<AppOptions>` — the fully resolved options with all defaults applied.

---

### `prepareAppOptions(cliOpts)`

Converts flat CLI-style options (where `allowDots`, `arrayFormat`, `mode`, etc. are top-level) to the nested `AppOptions` structure and fills in all defaults. Useful if you're building your own CLI on top of Swaggie.

```typescript
import { prepareAppOptions } from 'swaggie';

const options = prepareAppOptions({
  src: './spec.json',
  template: 'fetch',
  allowDots: true,
  arrayFormat: 'repeat',
  mode: 'full',
});
```

---

## Browser API (`swaggie/browser`)

The browser entry point is a trimmed-down version of the Node API designed for use in bundled browser applications. It:

- Does **not** support loading a config file (`config` option is rejected)
- Does **not** write output to disk (`out` option is rejected)
- Uses **pre-bundled templates** instead of reading them from the filesystem
- Supports passing a pre-parsed spec object directly (no filesystem access needed)

```typescript
import { runCodeGenerator } from 'swaggie/browser';

// Pass a pre-parsed OpenAPI object
const spec = JSON.parse(mySpecString); // or yaml.parse(mySpecString)

const [code] = await runCodeGenerator({
  src: spec,          // parsed OpenAPI object, or a URL string
  template: 'fetch',
  generationMode: 'full',
});

console.log(code); // Generated TypeScript
```

::: warning
The `src` option in browser mode accepts either a **URL string** (fetched at runtime) or a **pre-parsed OpenAPI object**. Local file paths are not supported in the browser.
:::

### Available templates in browser mode

All seven built-in templates are bundled and available in browser mode: `axios`, `fetch`, `xior`, `swr-axios`, `tsq-xior`, `ng1`, `ng2`.

Custom template directories are not supported in browser mode.

---

## TypeScript types reference

### `ClientOptions`

The core options interface shared by both Node and browser entry points.

```typescript
interface ClientOptions {
  src: string | object;               // URL, file path, or parsed spec object
  out?: string;                       // Output file path (Node only)
  template: Template;                 // HTTP client template
  baseUrl?: string;                   // Base URL for the generated client
  preferAny?: boolean;
  skipDeprecated?: boolean;
  servicePrefix?: string;
  dateFormat?: DateSupport;           // "Date" | "string"
  nullableStrategy?: NullableStrategy;
  generationMode?: GenerationMode;
  schemaDeclarationStyle?: SchemaDeclarationStyle;
  enumDeclarationStyle?: EnumDeclarationStyle;
  queryParamsSerialization: {
    allowDots?: boolean;
    arrayFormat?: ArrayFormat;
  };
  modifiers?: {
    parameters?: Record<string, 'optional' | 'required' | 'ignore'>;
  };
}
```

### `Template`

```typescript
type Template = 'axios' | 'fetch' | 'xior' | 'swr-axios' | 'tsq-xior' | 'ng1' | 'ng2';
```

### `CodeGenResult`

```typescript
type CodeGenResult = [string, AppOptions];
//                    ^code   ^resolved options
```

### Other string literal unions

```typescript
type DateSupport           = 'Date' | 'string';
type ArrayFormat           = 'indices' | 'repeat' | 'brackets';
type NullableStrategy      = 'include' | 'nullableAsOptional' | 'ignore';
type GenerationMode        = 'full' | 'schemas';
type SchemaDeclarationStyle = 'interface' | 'type';
type EnumDeclarationStyle  = 'union' | 'enum';
```

---

## Example: build script

Here's a complete example of using Swaggie in a build script:

```typescript
// scripts/gen-api.ts
import { runCodeGenerator } from 'swaggie';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  console.log('Generating API client...');

  await runCodeGenerator({
    src: process.env.API_SPEC_URL ?? 'https://api.example.com/openapi.json',
    out: './src/api/client.ts',
    template: 'axios',
    baseUrl: '/api',
    skipDeprecated: true,
  });

  // Format with Prettier
  await execAsync('prettier ./src/api/client.ts --write');

  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```
