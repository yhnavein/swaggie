import fs from 'node:fs';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateCode from './gen';
import type {
  AppOptions,
  BatchCodeGenResult,
  CliOptions,
  CodeGenResult,
  EnumNamesStyle,
  ExcludeOptions,
  FullAppOptions,
} from './types';
import { loadSpecDocument, verifyDocumentSpec, loadAllTemplateFiles } from './utils';
import { validateTemplate, normalizeTemplate, isL2Template } from './utils/templateValidator';
import { APP_DEFAULTS } from './swagger';

/**
 * Runs the whole code generation process.
 * When the config file contains an array of configs, returns `BatchCodeGenResult`
 * (an array of results, one per entry, fail-fast on first error).
 * Otherwise returns a single `CodeGenResult`.
 **/
export async function runCodeGenerator(
  options: Partial<FullAppOptions>
): Promise<CodeGenResult | BatchCodeGenResult> {
  try {
    verifyOptions(options);
    const optsOrArray = await applyConfigFile(options);

    if (Array.isArray(optsOrArray)) {
      const results: BatchCodeGenResult = [];
      for (const opts of optsOrArray) {
        verifyEntryOptions(opts);
        const spec = await loadSpecDocument(opts.src);
        const verifiedSpec = verifyDocumentSpec(spec);
        const code = await gen(verifiedSpec, opts);
        results.push([code, opts]);
      }
      return results;
    }

    const spec = await loadSpecDocument(optsOrArray.src);
    const verifiedSpec = verifyDocumentSpec(spec);
    const code = await gen(verifiedSpec, optsOrArray);

    return [code, optsOrArray];
  } catch (e) {
    return Promise.reject(e);
  }
}

function verifyOptions(options: Partial<FullAppOptions>) {
  if (!options) {
    throw new Error('Options were not provided');
  }
  if (!!options.config === !!options.src) {
    throw new Error('You need to provide either --config or --src parameters');
  }
  if (!!options.mocks !== !!options.testingFramework) {
    throw new Error('--mocks and --testingFramework must be used together');
  }
  if (options.mocks && !options.out) {
    throw new Error(
      '--mocks requires --out to be set, since the mock file needs to import the generated client'
    );
  }
  if (options.hooksOut && !options.out) {
    throw new Error('--hooksOut requires --out to be set');
  }
  if (options.clientSetup && !options.out) {
    throw new Error('--clientSetup requires --out to be set');
  }
  if (options.forceSetup && !options.clientSetup) {
    throw new Error('--forceSetup requires --clientSetup to be set');
  }
  if (options.hooksOut) {
    // Validate after normalization — template may be a bare L2 string or a pair
    const tpl = options.template;
    const isL2 =
      (typeof tpl === 'string' && isL2Template(tpl)) ||
      (Array.isArray(tpl) && typeof tpl[0] === 'string' && isL2Template(tpl[0]));
    if (!isL2) {
      throw new Error(
        '--hooksOut requires an L2 template (swr, tsq). ' +
          'Reactive hooks are only generated for L2 template pairs.'
      );
    }
  }
  verifyExcludeOptions(options.exclude);
}

/**
 * Validates options that apply to each individual entry in an array config.
 * Covers the same constraints as `verifyOptions` but scoped to a single
 * fully-resolved `AppOptions` entry (after config merging and defaults).
 */
function verifyEntryOptions(opts: AppOptions) {
  if (!opts.src) {
    throw new Error('Each config entry must have "src" set');
  }
  if (!!opts.mocks !== !!opts.testingFramework) {
    throw new Error('--mocks and --testingFramework must be used together');
  }
  if (opts.mocks && !opts.out) {
    throw new Error(
      '"mocks" requires "out" to be set, since the mock file needs to import the generated client'
    );
  }
  if (opts.hooksOut && !opts.out) {
    throw new Error('"hooksOut" requires "out" to be set');
  }
  if (opts.clientSetup && !opts.out) {
    throw new Error('"clientSetup" requires "out" to be set');
  }
  if (opts.forceSetup && !opts.clientSetup) {
    throw new Error('"forceSetup" requires "clientSetup" to be set');
  }
  if (opts.hooksOut) {
    const tpl = opts.template;
    const isL2 =
      (typeof tpl === 'string' && isL2Template(tpl)) ||
      (Array.isArray(tpl) && typeof tpl[0] === 'string' && isL2Template(tpl[0]));
    if (!isL2) {
      throw new Error(
        '"hooksOut" requires an L2 template (swr, tsq). ' +
          'Reactive hooks are only generated for L2 template pairs.'
      );
    }
  }
  verifyExcludeOptions(opts.exclude);
}

/**
 * Returns true when a pattern looks like a regex (starts with `/` or contains
 * regex-specific metacharacters that are not our supported wildcards).
 * Our supported wildcards are `*` and `?` only.
 */
function isRegexPattern(pattern: string): boolean {
  if (pattern.startsWith('/')) {
    return true;
  }
  // Characters that are regex metacharacters but are NOT our supported wildcards
  const regexOnlyChars = /[\\^$.|+()[\]{}]/;
  return regexOnlyChars.test(pattern);
}

/**
 * Throws if any pattern in `exclude.tags` or `exclude.operationIds` looks like
 * a regex. Only plain strings and * / ? wildcards are supported.
 */
function verifyExcludeOptions(exclude: ExcludeOptions | undefined) {
  if (!exclude) {
    return;
  }
  const allPatterns: Array<[string, string]> = [
    ...(exclude.tags ?? []).map((p): [string, string] => ['exclude.tags', p]),
    ...(exclude.operationIds ?? []).map((p): [string, string] => ['exclude.operationIds', p]),
  ];
  for (const [field, pattern] of allPatterns) {
    if (isRegexPattern(pattern)) {
      throw new Error(
        `Invalid pattern "${pattern}" in ${field}: regex patterns are not supported. ` +
          'Use plain strings or wildcard patterns with * and ? only.'
      );
    }
  }
}

/**
 * Throws if any per-entry-only keys are present as top-level defaults in a
 * multi-config file. These keys must live inside each entry under "configs".
 */
function verifyTopLevelDefaults(configUrl: string, defaults: Record<string, unknown>) {
  const blocked = ['src', 'out', 'hooksOut', 'mocks', 'clientSetup'];
  for (const key of blocked) {
    if (key in defaults) {
      throw new Error(
        `"${key}" cannot be a top-level default in multi-config file "${configUrl}". ` +
          `Set it inside each entry under "configs" instead.`
      );
    }
  }
}

/**
 * Throws if any file-path CLI flags are combined with a multi-config file.
 * Each entry in "configs" must define its own output paths.
 */
function verifyOptionsForArrayConfig(options: Partial<FullAppOptions>) {
  const blocked: Array<[keyof FullAppOptions, string]> = [
    ['out', '--out'],
    ['hooksOut', '--hooksOut'],
    ['mocks', '--mocks'],
    ['clientSetup', '--clientSetup'],
  ];
  for (const [key, flag] of blocked) {
    if (options[key]) {
      throw new Error(
        `${flag} cannot be used with a multi-config file. Set "${key}" in each entry under "configs" instead.`
      );
    }
  }
}

function gen(spec: OA3.Document, options: AppOptions): Promise<string> {
  if (options.generationMode === 'full') {
    validateTemplate(options.template);
    loadAllTemplateFiles(options.template);
  }

  return generateCode(spec, options);
}

export async function applyConfigFile(
  options: Partial<FullAppOptions> | Partial<CliOptions>
): Promise<AppOptions | AppOptions[]> {
  if (!options.config) {
    return prepareAppOptions(options as CliOptions);
  }

  const configUrl = options.config;
  let configContents: string;
  let parsedConfig: unknown;

  try {
    configContents = await readFile(configUrl);
    parsedConfig = JSON.parse(configContents);
  } catch (_e) {
    return Promise.reject(
      new Error('Could not correctly load config file. It does not exist or you cannot access it')
    );
  }

  if (!parsedConfig || typeof parsedConfig !== 'object') {
    return Promise.reject(
      new Error('Could not correctly load config file. It does not exist or you cannot access it')
    );
  }

  if ('configs' in (parsedConfig as object)) {
    const { configs: entries, ...topLevelDefaults } = parsedConfig as {
      configs: unknown;
      [k: string]: unknown;
    };
    if (!Array.isArray(entries) || entries.length < 1) {
      return Promise.reject(
        new Error(
          `Config file "${configUrl}" has a "configs" key but it is not a non-empty array. Provide at least one config entry.`
        )
      );
    }
    verifyTopLevelDefaults(configUrl, topLevelDefaults);
    verifyOptionsForArrayConfig(options);
    return entries.map((entry) =>
      prepareAppOptions({ ...topLevelDefaults, ...entry, ...options })
    );
  }

  return prepareAppOptions({ ...parsedConfig, ...options } as CliOptions);
}

function readFile(filePath: string): Promise<string> {
  return new Promise((res, rej) => {
    return fs.readFile(filePath, 'utf8', (err, contents) => (err ? rej(err) : res(contents)));
  });
}

export type { CodeGenResult, BatchCodeGenResult } from './types';

/**
 * CLI options are flat, but within the app we use nested objects.
 * This function converts flat options structure to the nested one and
 * merges it with the default values, producing a fully-initialized AppOptions
 * object where every defaultable field is guaranteed to be present.
 */
export function prepareAppOptions(cliOpts: CliOptions): AppOptions {
  const {
    allowDots,
    arrayFormat,
    queryParamsAsObject,
    mode,
    schemaStyle,
    enumStyle,
    enumNamesStyle,
    nullables,
    template,
    queryParamsSerialization = {},
    mocks,
    testingFramework,
    hooksOut,
    clientSetup,
    forceSetup,
    ...rest
  } = cliOpts;
  const mergedQueryParamsSerialization = {
    ...APP_DEFAULTS.queryParamsSerialization,
    ...Object.fromEntries(
      Object.entries(queryParamsSerialization).filter(([_, v]) => v !== undefined)
    ),
    ...(allowDots !== undefined ? { allowDots } : {}),
    ...(arrayFormat !== undefined ? { arrayFormat } : {}),
    ...(queryParamsAsObject !== undefined ? { queryParamsAsObject } : {}),
  };

  return {
    ...rest,
    template: normalizeTemplate(template ?? APP_DEFAULTS.template),
    servicePrefix: rest.servicePrefix ?? APP_DEFAULTS.servicePrefix,
    nullableStrategy: nullables ?? rest.nullableStrategy ?? APP_DEFAULTS.nullableStrategy,
    generationMode: mode ?? rest.generationMode ?? APP_DEFAULTS.generationMode,
    schemaDeclarationStyle:
      schemaStyle ?? rest.schemaDeclarationStyle ?? APP_DEFAULTS.schemaDeclarationStyle,
    enumDeclarationStyle:
      enumStyle ?? rest.enumDeclarationStyle ?? APP_DEFAULTS.enumDeclarationStyle,
    enumNamesStyle: normalizeEnumNamesStyle(enumNamesStyle),
    queryParamsSerialization: mergedQueryParamsSerialization,
    ...(mocks !== undefined ? { mocks } : {}),
    ...(testingFramework !== undefined ? { testingFramework } : {}),
    ...(hooksOut !== undefined ? { hooksOut } : {}),
    ...(clientSetup !== undefined ? { clientSetup } : {}),
    ...(forceSetup !== undefined ? { forceSetup } : {}),
  };
}

function normalizeEnumNamesStyle(value?: string): EnumNamesStyle {
  if (!value) return APP_DEFAULTS.enumNamesStyle;
  const lower = value.toLowerCase();
  if (lower === 'pascal' || lower === 'pascalcase') return 'PascalCase';
  if (lower === 'original') return 'original';
  return APP_DEFAULTS.enumNamesStyle;
}
