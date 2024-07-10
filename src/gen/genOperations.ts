import { camel } from 'case';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { getParameterType } from '../swagger';
import {
  groupOperationsByGroupName,
  getBestResponse,
  orderBy,
  renderFile,
  type MyContentType,
  getBestContentType,
} from '../utils';
import { generateBarrelFile } from './createBarrel';
import type { ApiOperation, ClientOptions } from '../types';
import { escapeReservedWords } from '../utils';
import { getOperations } from '../swagger';

/**
 * Function that will analyze paths in the spec and generate the code for all the operations.
 */
export default async function generateOperations(
  spec: OA3.Document,
  options: ClientOptions
): Promise<string> {
  const operations = getOperations(spec);
  const groups = groupOperationsByGroupName(operations);
  const servicePrefix = options.servicePrefix ?? '';
  let result =
    renderFile('baseClient.ejs', {
      servicePrefix,
      baseUrl: options.baseUrl,
      ...options.queryParamsSerialization,
    }) || '';

  for (const name in groups) {
    const group = groups[name];
    const clientData = prepareClient(servicePrefix + name, group, options);

    const renderedFile = renderFile('client.ejs', {
      ...clientData,
      servicePrefix,
    });

    result += renderedFile || '';
  }

  result += generateBarrelFile(groups, options);

  return result;
}

function prepareClient(
  name: string,
  operations: ApiOperation[],
  options: ClientOptions
): ClientData {
  const preparedOperations = prepareOperations(operations, options);

  return {
    clientName: name,
    camelCaseName: camel(name),
    operations: preparedOperations,
    baseUrl: options.baseUrl,
  };
}

export function prepareOperations(
  operations: ApiOperation[],
  options: ClientOptions
): IOperation[] {
  const ops = fixDuplicateOperations(operations);

  return ops.map((op) => {
    const [respObject, responseContentType] = getBestResponse(op);
    const returnType = getParameterType(respObject, options);

    const body = getRequestBody(op.requestBody);
    const queryParams = getParams(op.parameters as OA3.ParameterObject[], options, ['query']);
    const params = getParams(op.parameters as OA3.ParameterObject[], options);

    if (body) {
      params.unshift(body);
    }

    // If all parameters have 'x-position' defined, sort them by it
    if (params.every((p) => p.original['x-position'])) {
      params.sort((a, b) => a.original['x-position'] - b.original['x-position']);
    }

    const headers = getParams(op.parameters as OA3.ParameterObject[], options, ['header']);
    // Some libraries need to know the content type of the request body in case of urlencoded body
    if (body?.contentType === 'urlencoded') {
      headers.push({
        originalName: 'Content-Type',
        value: 'application/x-www-form-urlencoded',
      });
    }

    return {
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
 * This function will replace path template expressions with ${encodeURIComponent('paramName')} placeholders
 * The end result will be a string that is effectively a template (i.e. you should wrap end result with backticks)
 * This method is not really safe, but it will point out the potential issues with the path template expressions
 * So that the developer can see actual problem in the compiled code (as opposed to having a runtime issues)
 */
function prepareUrl(path: string): string {
  return path.replace(
    /{([^}/]+)}/g,
    (_, paramName) => `\${encodeURIComponent(\`\${${paramName}}\`)}`
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

function getParams(
  params: OA3.ParameterObject[],
  options: ClientOptions,
  where?: string[]
): IOperationParam[] {
  if (!params || params.length < 1) {
    return [];
  }

  return params
    .filter((p) => !where || where.includes(p.in))
    .map((p) => ({
      originalName: p.name,
      name: getParamName(p.name),
      type: getParameterType(p, options),
      optional: p.required === undefined || p.required === null ? true : !p.required,
      original: p,
    }));
}

/**
 * Escapes param names to more safe form
 */
export function getParamName(name: string): string {
  return escapeReservedWords(
    name
      .split('.')
      .map((x) => camel(x))
      .join('_')
  );
}

function getRequestBody(reqBody: OA3.ReferenceObject | OA3.RequestBodyObject): IBodyParam | null {
  if (reqBody && 'content' in reqBody) {
    const [bodyContent, contentType] = getBestContentType(reqBody);
    const isFormData = contentType === 'form-data';

    if (bodyContent) {
      return {
        originalName: reqBody['x-name'] ?? 'body',
        name: getParamName(reqBody['x-name'] ?? 'body'),
        type: isFormData ? 'FormData' : getParameterType(bodyContent, {}),
        optional: !reqBody.required,
        original: reqBody,
        contentType,
      };
    }
  }
  return null;
}

interface ClientData {
  clientName: string;
  camelCaseName: string;
  operations: IOperation[];
  baseUrl: string;
}

interface IOperation {
  returnType: string;
  responseContentType: string;
  method: string;
  name: string;
  url: string;
  parameters: IOperationParam[];
  query: IOperationParam[];
  body: IBodyParam;
  headers: IOperationParam[];
}

interface IOperationParam {
  originalName: string;
  name?: string;
  type?: string;
  value?: string;
  optional?: boolean;
  original?: OA3.ParameterObject | OA3.RequestBodyObject;
}

interface IBodyParam extends IOperationParam {
  contentType?: MyContentType;
}
