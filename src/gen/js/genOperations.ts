import { camel } from 'case';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { getParameterType } from './support';
import { groupOperationsByGroupName, getBestResponse, orderBy } from '../util';
import { generateBarrelFile } from './createBarrel';
import { renderFile } from '../templateManager';
import type { ApiOperation, ClientOptions } from '../../types';
import { escapeReservedWords } from '../../utils';
import { getOperations } from '../../swagger';

export default async function genOperations(
  spec: OA3.Document,
  options: ClientOptions
): Promise<string> {
  const operations = getOperations(spec);
  const groups = groupOperationsByGroupName(operations);
  let result =
    renderFile('baseClient.ejs', {
      servicePrefix: options.servicePrefix || '',
      baseUrl: options.baseUrl,
    }) || '';

  for (const name in groups) {
    const group = groups[name];
    const clientData = prepareClient((options.servicePrefix ?? '') + name, group, options);

    const renderedFile = renderFile('client.ejs', {
      ...clientData,
      servicePrefix: options.servicePrefix || '',
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
    const responseObject = getBestResponse(op);
    const returnType = getParameterType(responseObject, options);

    const queryParams = getParams(op.parameters as OA3.ParameterObject[], options, ['query']);
    const params = getParams(op.parameters as OA3.ParameterObject[], options);

    return {
      returnType,
      method: op.method.toUpperCase(),
      name: getOperationName(op.operationId, op.group),
      url: op.path,
      parameters: params,
      query: queryParams,
      pathParams: getParams(op.parameters as OA3.ParameterObject[], options, ['path']),
      body: op.requestBody as OA3.RequestBodyObject,
      headers: getParams(op.parameters as OA3.ParameterObject[], options, ['header']),
    };
  });
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

export function renderOperationGroup(
  group: any[],
  func: any,
  spec: OA3.Document,
  options: ClientOptions
): string[] {
  return group.map((op) => func.call(this, spec, op, options)).reduce((a, b) => a.concat(b));
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

interface ClientData {
  clientName: string;
  camelCaseName: string;
  operations: IOperation[];
  baseUrl: string;
}

interface IOperation {
  returnType: string;
  method: string;
  name: string;
  url: string;
  parameters: IOperationParam[];
  query: IOperationParam[];
  pathParams: IOperationParam[];
  body: OA3.RequestBodyObject;
  headers: IOperationParam[];
}

interface IOperationParam {
  originalName: string;
  name: string;
  type: string;
  optional: boolean;
}
