import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateOperations from './gen/genOperations';
import generateTypes from './gen/genTypes';
import { FILE_HEADER } from './gen/header';
import type { AppOptions, CliOptions, EnumNamesStyle, FullAppOptions } from './types';
import { APP_DEFAULTS } from './swagger';
import { BUNDLED_TEMPLATES } from './generated/bundledTemplates';
import { verifyDocumentSpec } from './utils/utils';
import { loadSpecDocument } from './utils/documentLoader.browser';
import { initTemplateEngineFromBundled } from './utils/templateEngine';

/**
 * Browser-friendly code generation entrypoint.
 * Unlike the Node entrypoint, this does not support config files or writing to disk.
 */
export async function runCodeGenerator(options: Partial<FullAppOptions>): Promise<CodeGenResult> {
  try {
    verifyOptions(options);
    const opts = prepareAppOptions(options as CliOptions);

    if (opts.out) {
      throw new Error('"out" option is not supported in browser mode');
    }

    const spec = await loadSpecDocument(opts.src);
    const verifiedSpec = verifyDocumentSpec(spec);
    const code = await generateCode(verifiedSpec, opts);

    return [code, opts];
  } catch (e) {
    return Promise.reject(e);
  }
}

export type CodeGenResult = [string, AppOptions];

function verifyOptions(options: Partial<FullAppOptions>) {
  if (!options) {
    throw new Error('Options were not provided');
  }
  if (options.config) {
    throw new Error('"config" option is not supported in browser mode');
  }
  if (!options.src) {
    throw new Error('You need to provide --src parameter');
  }
}

async function generateCode(spec: OA3.Document, options: AppOptions): Promise<string> {
  if (options.generationMode === 'schemas') {
    return FILE_HEADER + generateTypes(spec, options, false);
  }

  const templateFiles = BUNDLED_TEMPLATES[options.template];
  if (!templateFiles) {
    throw new Error(`Bundled templates for '${options.template}' are not available`);
  }

  initTemplateEngineFromBundled(templateFiles);
  const operationsCode = await generateOperations(spec, options);

  return operationsCode + generateTypes(spec, options);
}

/**
 * Browser options preparation mirrors Node behavior for consistency.
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
    template: template ?? APP_DEFAULTS.template,
    servicePrefix: rest.servicePrefix ?? APP_DEFAULTS.servicePrefix,
    nullableStrategy: nullables ?? rest.nullableStrategy ?? APP_DEFAULTS.nullableStrategy,
    generationMode: mode ?? rest.generationMode ?? APP_DEFAULTS.generationMode,
    schemaDeclarationStyle:
      schemaStyle ?? rest.schemaDeclarationStyle ?? APP_DEFAULTS.schemaDeclarationStyle,
    enumDeclarationStyle:
      enumStyle ?? rest.enumDeclarationStyle ?? APP_DEFAULTS.enumDeclarationStyle,
    enumNamesStyle: normalizeEnumNamesStyle(enumNamesStyle),
    queryParamsSerialization: mergedQueryParamsSerialization,
  };
}

function normalizeEnumNamesStyle(value?: string): EnumNamesStyle {
  if (!value) return APP_DEFAULTS.enumNamesStyle;
  const lower = value.toLowerCase();
  if (lower === 'pascal' || lower === 'pascalcase') return 'PascalCase';
  if (lower === 'original') return 'original';
  return APP_DEFAULTS.enumNamesStyle;
}
