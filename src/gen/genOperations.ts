import { camel } from 'case';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { getParameterType } from '../swagger';
import {
  groupOperationsByGroupName,
  getBestResponse,
  orderBy,
  renderFile,
  getBestContentType,
} from '../utils';
import { generateBarrelFile } from './createBarrel';
import type { ApiOperation, AppOptions } from '../types';
import { escapeIdentifier } from '../utils';
import { getOperations } from '../swagger';
import { ClientData, IBodyParam, IOperation, IOperationParam } from './types';
import { prepareJsDocsForOperation } from './jsDocs';

/**
 * Function that will analyze paths in the spec and generate the code for all the operations.
 */
export default async function generateOperations(
  spec: OA3.Document,
  options: AppOptions
): Promise<string> {
  const operations = getOperations(spec);
  const groups = groupOperationsByGroupName(operations);
  const servicePrefix = options.servicePrefix;
  let result = renderFile('baseClient.ejs', {
    servicePrefix,
    baseUrl: options.baseUrl,
    ...options.queryParamsSerialization,
  });

  for (const name in groups) {
    const group = groups[name];
    const clientData = prepareClient(servicePrefix + name, group, options);

    if (!clientData) {
      continue;
    }

    const renderedFile = renderFile('client.ejs', {
      ...clientData,
      servicePrefix,
    });

    result += renderedFile;
  }

  result += generateBarrelFile(groups, options);

  return result;
}

function prepareClient(
  name: string,
  operations: ApiOperation[],
  options: AppOptions
): ClientData | null {
  const preparedOperations = prepareOperations(operations, options);

  if (preparedOperations.length === 0) {
    return null;
  }

  return {
    clientName: name,
    camelCaseName: camel(name),
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
export function prepareOperations(operations: ApiOperation[], options: AppOptions): IOperation[] {
  let ops = fixDuplicateOperations(operations);

  if (options.skipDeprecated) {
    ops = ops.filter((op) => !op.deprecated);
  }

  return ops.map((op) => {
    const [respObject, responseContentType] = getBestResponse(op);
    const returnType = getParameterType(respObject, options);

    const body = getRequestBody(op.requestBody, options);
    const queryParams = getParams(op.parameters as OA3.ParameterObject[], options, ['query']);
    const params = getParams(op.parameters as OA3.ParameterObject[], options);

    if (body) {
      params.unshift(body);
    }

    // If all parameters have 'x-position' defined, sort them by it
    if (params.every((p) => p.original['x-position'])) {
      params.sort((a, b) => a.original['x-position'] - b.original['x-position']);
    }

    markParametersAsSkippable(params);

    const headers = getParams(op.parameters as OA3.ParameterObject[], options, ['header']);
    // Some libraries need to know the content type of the request body in case of urlencoded body
    if (body?.contentType === 'urlencoded') {
      headers.push({
        originalName: 'Content-Type',
        value: 'application/x-www-form-urlencoded',
      });
    }

    return {
      jsDocs: prepareJsDocsForOperation(op, params),
      returnType,
      responseContentType,
      method: op.method.toUpperCase(),
      name: getOperationName(op.operationId, op.group),
      url: prepareUrl(op.path),
      parameters: params,
      query: queryParams,
      body,
      headers,
    };
  });
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
  if (!operations || operations.length < 2) {
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
    return name;
  }

  return escapeIdentifier(
    name
      .split('.')
      .map((x) => camel(x))
      .join('_')
  );
}

function getRequestBody(
  reqBody: OA3.ReferenceObject | OA3.RequestBodyObject,
  options: AppOptions
): IBodyParam | null {
  if (reqBody && 'content' in reqBody) {
    const [bodyContent, contentType] = getBestContentType(reqBody);
    const isFormData = contentType === 'form-data';

    if (bodyContent) {
      return {
        originalName: reqBody['x-name'] ?? 'body',
        name: getParamName(reqBody['x-name'] ?? 'body'),
        type: isFormData ? 'FormData' : getParameterType(bodyContent, options),
        optional: !reqBody.required,
        original: reqBody,
        contentType,
      };
    }
  }
  return null;
}
