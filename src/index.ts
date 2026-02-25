import fs from 'node:fs';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateCode from './gen';
import type { AppOptions, CliOptions, FullAppOptions } from './types';
import { loadSpecDocument, verifyDocumentSpec, loadAllTemplateFiles } from './utils';
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
}

function gen(spec: OA3.Document, options: AppOptions): Promise<string> {
  loadAllTemplateFiles(options.template);

  return generateCode(spec, options);
}

export async function applyConfigFile(options: Partial<FullAppOptions>): Promise<AppOptions> {
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
  const { allowDots, arrayFormat, template, queryParamsSerialization = {}, ...rest } = cliOpts;
  const mergedQueryParamsSerialization = {
    ...APP_DEFAULTS.queryParamsSerialization,
    ...Object.fromEntries(
      Object.entries(queryParamsSerialization).filter(([_, v]) => v !== undefined)
    ),
    ...(allowDots !== undefined ? { allowDots } : {}),
    ...(arrayFormat !== undefined ? { arrayFormat } : {}),
  };

  return {
    ...rest,
    template: template ?? APP_DEFAULTS.template,
    servicePrefix: rest.servicePrefix ?? APP_DEFAULTS.servicePrefix,
    nullableStrategy: rest.nullableStrategy ?? APP_DEFAULTS.nullableStrategy,
    queryParamsSerialization: mergedQueryParamsSerialization,
  };
}
