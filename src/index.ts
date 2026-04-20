import fs from 'node:fs';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateCode from './gen';
import type { AppOptions, CliOptions, EnumNamesStyle, FullAppOptions } from './types';
import { loadSpecDocument, verifyDocumentSpec, loadAllTemplateFiles } from './utils';
import { validateTemplate, normalizeTemplate, isL2Template } from './utils/templateValidator';
import { APP_DEFAULTS } from './swagger';

/**
 * Runs the whole code generation process.
 * @returns `CodeGenResult`
 **/
export async function runCodeGenerator(options: Partial<FullAppOptions>): Promise<CodeGenResult> {
  try {
    verifyOptions(options);
    const opts = await applyConfigFile(options);
    const spec = await loadSpecDocument(opts.src);
    const verifiedSpec = verifyDocumentSpec(spec);
    const code = await gen(verifiedSpec, opts);

    return [code, opts];
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
): Promise<AppOptions> {
  try {
    if (!options.config) {
      return prepareAppOptions(options as CliOptions);
    }

    const configUrl = options.config;
    const configContents = await readFile(configUrl);
    const parsedConfig = JSON.parse(configContents);
    if (!parsedConfig || parsedConfig.length < 1) {
      throw new Error(
        `Could not correctly parse config file from "${configUrl}". Is it a valid JSON file?`
      );
    }
    return prepareAppOptions({ ...parsedConfig, ...options });
  } catch (e) {
    return Promise.reject(
      new Error('Could not correctly load config file. It does not exist or you cannot access it')
    );
  }
}

function readFile(filePath: string): Promise<string> {
  return new Promise((res, rej) => {
    return fs.readFile(filePath, 'utf8', (err, contents) => (err ? rej(err) : res(contents)));
  });
}

export type CodeGenResult = [string, AppOptions];

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
