import { camel } from 'case';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { getParameterType, getOperations } from '../swagger';
import {
  escapeIdentifier,
  getBestContentType,
  getBestResponse,
  groupOperationsByGroupName,
  orderBy,
} from '../utils/utils';
import { renderFile, hasTemplateFile } from '../utils/templateEngine';
import { getL1Template, getHttpConfigType, getResponseMapper } from '../utils/templateValidator';
import { generateBarrelFile } from './createBarrel';
import { FILE_HEADER } from './header';
import type { ApiOperation, AppOptions } from '../types';
import type {
  ClientData,
  IBodyParam,
  IOperation,
  IOperationParam,
  PositionedParameter,
} from './types';
import { prepareJsDocsForOperation } from './jsDocs';

/**
 * Function that will analyze paths in the spec and generate the code for all the operations.
 *
 * @param relativeSetupImport - When `--clientSetup` is active for the ky template, the relative
 *   import path from the generated `api.ts` to the setup file (e.g. `'./api.setup'`).
 *   Used to embed the import in `baseClientWithSetup.ejs` and passed to each operation
 *   as `httpAccessor` (`'getKyHttp()'` vs the default `'http'`).
 */
export default async function generateOperations(
  spec: OA3.Document,
  options: AppOptions,
  relativeSetupImport?: string
): Promise<string> {
  const operations = getOperations(spec);
  const groups = groupOperationsByGroupName(operations);
  const servicePrefix = options.servicePrefix;
  const isKyWithSetup = getL1Template(options.template) === 'ky' && !!options.clientSetup;

  const baseClientData = {
    servicePrefix,
    baseUrl: options.baseUrl,
    ...options.queryParamsSerialization,
    // For the ky+setup variant, embed the relative import to the setup file
    ...(isKyWithSetup && relativeSetupImport ? { relativeSetupImport } : {}),
  };

  // When a composite [L2, L1] template is used, the L2 base client contains
  // reactive library imports (e.g. useSWR, useQuery). These are placed first
  // so all imports appear at the top of the file before the HTTP client setup.
  // When hooksOut is set, the L2 base client goes into the hooks file instead.
  let baseClients = '';
  if (hasTemplateFile('baseClientL2.ejs') && !options.hooksOut) {
    baseClients += renderFile('baseClientL2.ejs', baseClientData);
  }
  // For ky with --clientSetup, use the lazy initKyHttp/getKyHttp pattern.
  // We rely on the template being present (always bundled for ky), so no
  // hasTemplateFile guard — hasTemplateFile returns false for directory templates.
  const baseClientTemplate =
    isKyWithSetup ? 'baseClientWithSetup.ejs' : 'baseClient.ejs';
  baseClients += renderFile(baseClientTemplate, baseClientData);

  // When hooksOut is set, the 'use client' directive belongs in the hooks file only.
  // In single-file mode (no hooksOut), keep prepending it to the main file.
  const clientDirective = options.useClient && !options.hooksOut ? "'use client';\n" : '';
  let result = clientDirective + FILE_HEADER + baseClients;

  for (const name in groups) {
    const group = groups[name];
    const clientData = prepareClient(servicePrefix + name, group, spec.components, options);

    if (!clientData) {
      continue;
    }

    const renderedFile = renderFile('client.ejs', {
      ...clientData,
      servicePrefix,
      httpConfigType: getHttpConfigType(options.template),
      responseMapper: getResponseMapper(options.template),
      // For the ky+setup variant, operations call getKyHttp() instead of the
      // module-level `http` singleton.
      httpAccessor: isKyWithSetup ? 'getKyHttp()' : 'http',
      // In split-file mode, the hooks namespace is generated in a separate file.
      // Pass splitMode=true so the client.ejs template skips the hooks block.
      splitMode: !!options.hooksOut,
      // Template helper functions — defined once here, used in all L2 templates.
      toOpName,
      safeOperation,
    });

    result += renderedFile;
  }

  result += generateBarrelFile(groups, options);

  return result;
}

/**
 * Generates the content of the write-once client setup scaffold file.
 *
 * For the `ky` template, renders `baseClientSetup.ejs` which exports a
 * `createKyConfig()` function imported by the generated `api.ts`.
 * For other templates (`axios`, `xior`, `fetch`), renders a standalone
 * interceptor scaffold that is NOT imported by `api.ts`.
 *
 * @param relativeApiImport - Relative import path from the setup file back to api.ts
 * @param relativeSetupImport - Relative import path from api.ts to the setup file
 *   (only used in the ky scaffold comment to show the correct usage example)
 */
export function generateClientSetup(
  options: AppOptions,
  relativeApiImport: string,
  relativeSetupImport: string
): string {
  const setupData = {
    baseUrl: options.baseUrl,
    relativeApiImport,
    relativeSetupImport,
  };

  try {
    return renderFile('baseClientSetup.ejs', setupData);
  } catch {
    // Template not available for this L1 (e.g. ng1/ng2 don't have a setup template)
    return '';
  }
}

/**
 * Generates the reactive hooks file content (for use with --hooksOut).
 *
 * The hooks file contains:
 * - An optional `'use client';` directive (when useClient is set)
 * - The L2 reactive library imports (useSWR / useQuery etc.)
 * - A namespace import of the main file: `import * as API from '<relativeMainImport>'`
 * - One `export const <name> = { queries, mutations, queryKeys }` per tag group,
 *   referencing HTTP client methods via `API.<name>Client.*`
 *
 * This function requires the template engine to already be initialized with the
 * L2 template files (i.e. `loadAllTemplateFiles` must have been called first).
 */
export async function generateHooks(
  spec: OA3.Document,
  options: AppOptions,
  relativeMainImport: string
): Promise<string> {
  const operations = getOperations(spec);
  const groups = groupOperationsByGroupName(operations);
  const servicePrefix = options.servicePrefix;
  const baseClientData = {
    servicePrefix,
    baseUrl: options.baseUrl,
    ...options.queryParamsSerialization,
  };

  // L2 base client contains the reactive library imports (useSWR, useQuery, etc.)
  let header = '';
  if (hasTemplateFile('baseClientL2.ejs')) {
    header += renderFile('baseClientL2.ejs', baseClientData);
  }

  const clientDirective = options.useClient ? "'use client';\n" : '';
  let result = clientDirective + FILE_HEADER + header;

  // Import the L1 $httpConfig type directly from its source package so it is
  // available in the hooks file without having to prefix it with API.
  const l1HttpTypeImport = getL1HttpTypeImport(options.template);
  if (l1HttpTypeImport) {
    result += l1HttpTypeImport + '\n';
  }

  // Import the main file as a namespace so we can reference API.*Client, API.encodeParams,
  // and API.DomainTypes (used in hook generics via prefixApiType in the templates).
  result += `import * as API from '${relativeMainImport}';\n\n`;

  for (const name in groups) {
    const group = groups[name];
    const clientData = prepareClient(servicePrefix + name, group, spec.components, options);

    if (!clientData) {
      continue;
    }

    const renderedFile = renderFile('hooksClient.ejs', {
      ...clientData,
      servicePrefix,
      httpConfigType: getHttpConfigType(options.template),
      responseMapper: getResponseMapper(options.template),
      // Template helper functions — defined once here, used in all L2 templates.
      toOpName,
      safeOperation,
      prefixApiType,
    });

    result += renderedFile;
  }

  return result;
}

function prepareClient(
  name: string,
  operations: ApiOperation[],
  components: OA3.ComponentsObject | undefined,
  options: AppOptions
): ClientData | null {
  const preparedOperations = prepareOperations(operations, options, components);

  if (preparedOperations.length === 0) {
    return null;
  }

  const camelCaseName = camel(name);
  // `default` is a JS reserved word — it is valid in `defaultClient` (HTTP
  // client export) but not as a standalone `export const default = {}` used by
  // the reactive hooks templates. When the camel-cased name would be `default`,
  // we use `main` for the hooks namespace instead.
  const hooksCamelCaseName = camelCaseName === 'default' ? 'main' : camelCaseName;

  return {
    clientName: name,
    camelCaseName,
    hooksCamelCaseName,
    operations: preparedOperations,
    baseUrl: options.baseUrl,
  };
}

/**
 * Prepares operations for client generation. A lot of things will be done here:
 * - Fix duplicate operation names
 * - Determine the best response object and content type
 * - Get the parameter type for the response object
 * - Get the request body, query parameters, and other parameters
 * - Sort parameters by their 'x-position' if defined
 *
 * @param operations Flat list of operations from the spec
 * @param options
 * @returns List of operations prepared for client generation
 */
export function prepareOperations(
  operations: ApiOperation[],
  options: AppOptions,
  components?: OA3.ComponentsObject
): IOperation[] {
  let ops = fixDuplicateOperations(operations);

  if (options.skipDeprecated) {
    ops = ops.filter((op) => !op.deprecated);
  }

  return ops.map((op) => {
    const operationContext = `${op.method.toUpperCase()} ${op.path} (${op.operationId || 'unknown operationId'})`;

    try {
      const [respObject, responseContentType] = getBestResponse(op, components);
      const returnType = respObject
        ? getParameterType(respObject, options)
        : options.preferAny
          ? 'any'
          : 'unknown';

      const body = op.requestBody ? getRequestBody(op.requestBody, components, options) : null;
      const queryParams = getParams(op.parameters as OA3.ParameterObject[], options, ['query']);
      let params = getParams(op.parameters as OA3.ParameterObject[], options);
      let queryParamObject: IOperationParam | undefined;

      if (body) {
        params.unshift(body);
      }

      // If all parameters have 'x-position' defined, sort them by it
      if (params.every((p) => p.original && 'x-position' in p.original)) {
        params.sort(
          (a, b) =>
            (a.original as PositionedParameter)['x-position'] -
            (b.original as PositionedParameter)['x-position']
        );
      }

      if (
        shouldGroupQueryParams(queryParams, options.queryParamsSerialization.queryParamsAsObject)
      ) {
        queryParamObject = createQueryParamObject(queryParams);
        params = replaceQueryParamsWithObject(params, queryParamObject);
      }

      markParametersAsSkippable(params);

      const headers = getParams(op.parameters as OA3.ParameterObject[], options, ['header']);
      // Some libraries need explicit Content-Type for request bodies.
      if (body?.contentType === 'urlencoded') {
        upsertFixedHeader(headers, 'Content-Type', 'application/x-www-form-urlencoded');
      } else if (body?.contentType === 'json' && getL1Template(options.template) === 'fetch') {
        upsertFixedHeader(headers, 'Content-Type', 'application/json');
      }

      return {
        jsDocs: prepareJsDocsForOperation(op, params),
        returnType,
        responseContentType,
        method: op.method.toUpperCase(),
        name: getOperationName(op.operationId ?? null, op.group),
        url: prepareUrl(op.path),
        parameters: params,
        query: queryParams,
        queryParamObject,
        body,
        headers,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid schema at')) {
        throw new Error(
          `Failed to prepare operation ${operationContext}. ` +
            'Check if schema is valid for this operation. ' +
            'Most common culprit is `properties.$ref` (use `schema.$ref` at root, or put `$ref` under a named property).'
        );
      }

      throw new Error(`Failed to prepare operation ${operationContext}: ${message}`);
    }
  });
}

function shouldGroupQueryParams(
  queryParams: IOperationParam[],
  setting: boolean | number
): boolean {
  if (queryParams.length < 1 || setting === false) {
    return false;
  }

  if (setting === true) {
    return true;
  }

  return queryParams.length > setting;
}

function createQueryParamObject(queryParams: IOperationParam[]): IOperationParam {
  const properties = queryParams
    .map((param) => {
      const isOptional = param.optional ? '?' : '';
      const nullableType = param.optional ? ' | null' : '';
      return `${param.name}${isOptional}: ${param.type}${nullableType};`;
    })
    .join(' ');
  const containsRequiredQueryParams = queryParams.some((param) => !param.optional);

  return {
    originalName: 'queryParams',
    name: 'queryParams',
    type: `{ ${properties} }`,
    optional: !containsRequiredQueryParams,
    jsDoc: `Grouped query parameters object (${queryParams
      .map((param) => param.originalName)
      .join(', ')})`,
  };
}

function replaceQueryParamsWithObject(
  params: IOperationParam[],
  queryParamObject: IOperationParam
): IOperationParam[] {
  const isQueryParam = (param: IOperationParam) =>
    !!param.original && 'in' in param.original && param.original.in === 'query';

  const firstQueryParamIndex = params.findIndex(isQueryParam);
  if (firstQueryParamIndex < 0) {
    return params;
  }

  const paramsWithoutQuery = params.filter((param) => !isQueryParam(param));
  paramsWithoutQuery.splice(firstQueryParamIndex, 0, queryParamObject);
  return paramsWithoutQuery;
}

/**
 * Marks parameters as skippable based on their position relative to the last required parameter.
 *
 * In TypeScript/JavaScript, optional parameters must come after required ones. This function
 * finds the last required parameter and marks all subsequent optional parameters as "skippable",
 * meaning they can be omitted from function calls without affecting the parameter order.
 *
 * @example
 * Parameters: [required1, optional1, required2, optional2, optional3]
 * Result:     [required1, optional1, required2, optional2?, optional3?]
 *
 * @param params - Array of operation parameters to analyze and mark as skippable (modified in-place)
 */
function markParametersAsSkippable(params: IOperationParam[]): void {
  const lastRequiredParamIndex = params.map((p) => !p.optional).lastIndexOf(true);
  if (lastRequiredParamIndex === params.length - 1) {
    return;
  }

  for (let i = lastRequiredParamIndex + 1; i < params.length; i++) {
    params[i].skippable = true;
  }
}

/**
 * Converts OpenAPI path templates to TypeScript template literal format.
 * Transforms '{paramName}' to '${encodeURIComponent(`${paramName}`)}'.
 * The result should be wrapped in backticks to create a template literal.
 *
 * @example
 * '/users/{userId}/posts/{postId}' → '/users/${encodeURIComponent(`${userId}`)}/posts/${encodeURIComponent(`${postId}`)}'
 */
function prepareUrl(path: string): string {
  return path.replace(
    /{([^}/]+)}/g,
    (_, paramName) => `\${encodeURIComponent(\`\${${getParamName(paramName)}}\`)}`
  );
}

/**
 * Let's add numbers to the duplicated operation names to avoid breaking code.
 * Duplicated operation names are not allowed by the OpenAPI spec, but in the real world
 * it can happen very easily and we need to handle it gracefully.
 */
export function fixDuplicateOperations(operations: ApiOperation[]): ApiOperation[] {
  if (!operations) {
    return [];
  }

  if (operations.length < 2) {
    return operations;
  }

  const ops = operations.map((a) => Object.assign({}, a));
  const results = orderBy(ops, 'operationId');

  let inc = 0;
  let prevOpId = results[0].operationId;
  for (let i = 1; i < results.length; i++) {
    if (results[i].operationId === prevOpId) {
      results[i].operationId += (++inc).toString();
    } else {
      inc = 0;
      prevOpId = results[i].operationId;
    }
  }

  return results;
}

/**
 * Some spec generators include group name in the operationId. We need to remove them as they are redundant.
 * @example
 * getOperationName('Group_Operation', 'Group') -> 'Operation'
 * */
export function getOperationName(opId: string | null, group?: string | null) {
  if (!opId) {
    return '';
  }
  if (!group) {
    return opId;
  }

  return camel(opId.replace(`${group}_`, ''));
}

export function getParams(
  params: OA3.ParameterObject[],
  options: AppOptions,
  where?: string[]
): IOperationParam[] {
  if (!params || params.length < 1) {
    return [];
  }

  const result = params
    .filter((p) => p.name && (!where || where.includes(p.in)))
    .map((p) => ({
      originalName: p.name,
      name: getParamName(p.name),
      type: getParameterType(p, options),
      optional: p.required === undefined || p.required === null ? true : !p.required,
      original: p,
      jsDoc: p.description?.trim(),
    }));

  if (options.modifiers?.parameters) {
    for (const [name, modifier] of Object.entries(options.modifiers.parameters)) {
      const paramIndex = result.findIndex(
        (p) => p.original.in !== 'path' && (p.originalName === name || p.name === name)
      );
      if (paramIndex === -1) {
        continue;
      }
      const param = result[paramIndex];

      if (modifier === 'optional') {
        param.optional = true;
      } else if (modifier === 'required') {
        param.optional = false;
      } else if (modifier === 'ignore') {
        result.splice(paramIndex, 1);
      }
    }
  }

  return result;
}

/**
 * Escapes param name so it can be used as a valid identifier in the generated code
 */
export function getParamName(name?: string | null): string {
  if (!name) {
    return name ?? '';
  }

  return escapeIdentifier(
    name
      .split('.')
      .map((x) => camel(x))
      .join('_')
  );
}

function getRequestBody(
  rawReqBody: OA3.ReferenceObject | OA3.RequestBodyObject,
  components: OA3.ComponentsObject | undefined,
  options: AppOptions
): IBodyParam | null {
  if (!rawReqBody) {
    return null;
  }

  let reqBody: OA3.RequestBodyObject;
  if ('$ref' in rawReqBody) {
    const refName = rawReqBody.$ref.replace('#/components/requestBodies/', '');
    const resolved = components?.requestBodies?.[refName];
    if (!resolved || '$ref' in resolved) {
      console.error(`RequestBody $ref '${rawReqBody.$ref}' not found in components/requestBodies`);
      return null;
    }
    reqBody = resolved;
  } else {
    reqBody = rawReqBody;
  }

  const [bodyContent, contentType] = getBestContentType(reqBody);
  const isFormData = contentType === 'form-data';

  if (bodyContent) {
    const reqBodyAny = reqBody as unknown as Record<string, string | undefined>;
    const xName = reqBodyAny['x-name'];
    return {
      originalName: xName ?? 'body',
      name: getParamName(xName ?? 'body'),
      type: isFormData ? 'FormData' : getParameterType(bodyContent, options),
      optional: !reqBody.required,
      original: reqBody,
      contentType: contentType ?? undefined,
    };
  }

  return null;
}

/**
 * Returns a TypeScript import statement for the L1 HTTP config type so that it
 * is available in the hooks file by its bare name (e.g. `AxiosRequestConfig`)
 * without needing an `API.` prefix.
 *
 * Returns `null` for `fetch` (uses the built-in `RequestInit` — no import needed)
 * and for custom/unknown L1 templates.
 */
// ─── Template helper functions ─────────────────────────────────────────────
// Defined here in TypeScript and passed into template data so the EJS files
// have no local function definitions and no duplication across templates.

/**
 * Converts an operation name to the PascalCase suffix used in hook/query key
 * names: strips a leading "get" prefix (case-insensitive), then capitalises.
 *
 * @example toOpName('getPetById')      → 'PetById'
 * @example toOpName('findPetsByStatus') → 'FindPetsByStatus'
 */
export function toOpName(name: string): string {
  const n = name.toLowerCase().startsWith('get') ? name.slice(3) : name;
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/**
 * Returns a copy of `operation` where any parameter whose name matches
 * `clientName` is renamed to `_<name>` to avoid TypeScript variable shadowing
 * inside the hook object literal.
 */
export function safeOperation<T extends { parameters: Array<{ name: string }> }>(
  operation: T,
  clientName: string
): T {
  const safeParams = operation.parameters.map((p) =>
    p.name === clientName ? { ...p, name: `_${p.name}` } : p
  );
  return { ...operation, parameters: safeParams };
}

// `API` is included here because it is the namespace we emit ourselves — it
// must never be prefixed with a second `API.` in the output.
// Web API / Browser globals are included so they are never incorrectly namespaced
// as `API.FormData`, `API.File`, `API.Blob`, etc.
const PRIMITIVES =
  /^(API|unknown|string|number|boolean|void|null|undefined|any|never|Date|object|Record|Array|Pick|Omit|Required|Partial|Readonly|NonNullable|ReturnType|InstanceType|Parameters|ConstructorParameters|FormData|File|Blob|URLSearchParams|ArrayBuffer|ReadableStream|Response|Request|Headers|Event|EventTarget)$/;

/**
 * Prefixes named (non-primitive) TypeScript type names in a type string with
 * the `API.` namespace so they resolve to types exported from the main file
 * when the hooks are in a separate file (split-file / --hooksOut mode).
 *
 * Works on any type string structure — bare names, arrays, unions, intersections,
 * and inline object types (including PascalCase names used as property value types
 * inside `{ key: SomeType }` shapes).
 *
 * @example prefixApiType('Pet')                          → 'API.Pet'
 * @example prefixApiType('Pet[]')                        → 'API.Pet[]'
 * @example prefixApiType('Pet | null')                   → 'API.Pet | null'
 * @example prefixApiType('unknown')                      → 'unknown'
 * @example prefixApiType('{ id: number }')               → '{ id: number }'
 * @example prefixApiType('{ profile: MyEnum; }')         → '{ profile: API.MyEnum; }'
 * @example prefixApiType('API.Pet')                      → 'API.Pet' (API itself is in the exclude list)
 */
export function prefixApiType(typeStr: string): string {
  if (!typeStr) {
    return typeStr;
  }
  // The negative lookbehind `(?<!\.)` skips identifiers that are already part
  // of a namespace reference (e.g. `API.Pet` — when the regex reaches `Pet` it
  // is preceded by `.`, so we leave it alone).
  return typeStr.replace(/(?<!\.)\b([A-Z][A-Za-z0-9_]*)\b/g, (match) =>
    PRIMITIVES.test(match) ? match : `API.${match}`
  );
}

function getL1HttpTypeImport(template: AppOptions['template']): string | null {
  const l1 = getL1Template(template);
  switch (l1) {
    case 'axios':
      return "import type { AxiosRequestConfig } from 'axios';";
    case 'xior':
      return "import type { XiorRequestConfig } from 'xior';";
    case 'fetch':
      // RequestInit is a global built-in — no import needed
      return null;
    case 'ky':
      return "import type { Options as KyOptions } from 'ky';";
    default:
      return null;
  }
}

function upsertFixedHeader(headers: IOperationParam[], headerName: string, value: string): void {
  const headerIndex = headers.findIndex(
    (header) => header.originalName.toLowerCase() === headerName.toLowerCase()
  );

  if (headerIndex >= 0) {
    headers[headerIndex].value = value;
    return;
  }

  headers.push({
    originalName: headerName,
    value,
  });
}
