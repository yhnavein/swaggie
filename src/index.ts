import fs from 'node:fs';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateCode from './gen';
import type { ArrayFormat, ClientOptions, FullAppOptions } from './types';
import { loadSpecDocument, verifyDocumentSpec, loadAllTemplateFiles } from './utils';

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

function gen(spec: OA3.Document, options: ClientOptions): Promise<string> {
  loadAllTemplateFiles(options.template || 'axios');

  return generateCode(spec, options);
}

export async function applyConfigFile(options: Partial<FullAppOptions>): Promise<ClientOptions> {
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
      'Could not correctly load config file. It does not exist or you cannot access it'
    );
  }
}

function readFile(filePath: string): Promise<string> {
  return new Promise((res, rej) => {
    return fs.readFile(filePath, 'utf8', (err, contents) => (err ? rej(err) : res(contents)));
  });
}

export type CodeGenResult = [string, ClientOptions];

interface CliOptions extends FullAppOptions {
  allowDots?: boolean;
  arrayFormat?: ArrayFormat;
}

const defaultQueryParamsConfig = {
  allowDots: true,
  arrayFormat: 'repeat' as const,
};

/**
 * CLI options are flat, but within the app we use nested objects.
 * This function converts flat options structure to the nested one and
 * merges it with the default values.
 * */
function prepareAppOptions(cliOpts: CliOptions): FullAppOptions {
  const { allowDots, arrayFormat, queryParamsSerialization = {}, ...rest } = cliOpts;
  const mergedQueryParamsSerialization = {
    ...defaultQueryParamsConfig,
    ...Object.fromEntries(
      Object.entries(queryParamsSerialization).filter(([_, v]) => v !== undefined)
    ),
    ...(allowDots !== undefined ? { allowDots } : {}),
    ...(arrayFormat !== undefined ? { arrayFormat } : {}),
  };

  return { ...rest, queryParamsSerialization: mergedQueryParamsSerialization };
}
