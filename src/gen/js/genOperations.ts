import { camel } from 'case';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { getParameterType } from './support';
import { groupOperationsByGroupName, getBestResponse, orderBy } from '../util';
import type { IServiceClient, IApiOperation, IOperationParam } from './models';
import { generateBarrelFile } from './createBarrel';
import { renderFile } from '../templateManager';
import type { ApiOperation, ClientOptions } from '../../types';
import { escapeReservedWords } from '../../utils';

export default async function genOperations(
  spec: OA3.Document,
  operations: ApiOperation[],
  options: ClientOptions
): Promise<string> {
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
  operations: OA3.OperationObject[],
  options: ClientOptions
): IServiceClient {
  const preparedOperations = prepareOperations(operations, options);

  return {
    clientName: name,
    camelCaseName: camel(name),
    operations: preparedOperations,
    baseUrl: options.baseUrl,
  };
}

export function prepareOperations(
  operations: OA3.OperationObject[],
  options: ClientOptions
): IApiOperation[] {
  const ops = fixDuplicateOperations(operations);

  return ops.map((op) => {
    const response = getBestResponse(op);
    const respType = getParameterType(response, options);

    const queryParams = getParams(op.parameters, options, ['query']);
    const params = getParams(op.parameters, options);

    return {
      returnType: respType,
      method: op.method.toUpperCase(),
      name: getOperationName(op.operationId, op.group),
      url: op.path,
      parameters: params,
      query: queryParams,
      formData: getParams(op.parameters, options, ['formData']),
      pathParams: getParams(op.parameters, options, ['path']),
      body: getParams(op.parameters, options, ['body']).pop(),
      headers: getHeaders(op, options),
    };
  });
}

/**
 * We will add numbers to the duplicated operation names to avoid breaking code
 * @param operations
 */
export function fixDuplicateOperations(operations: OA3.OperationObject[]): OA3.OperationObject[] {
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

function getHeaders(op: OA3.OperationObject, options: ClientOptions): IOperationParam[] {
  const headersFromParams = getParams(op.parameters, options, ['header']);
  // TODO: At some point there may be need for a new param to add implicitly default content types
  // TODO: At this time content-type support was not essential to move forward with this functionality
  // It needs to be reviewed

  // if (
  //   op.contentTypes.length > 0 &&
  //   headersFromParams.filter((p) => p.originalName.toLowerCase() === 'content-type').length === 0
  // ) {
  //   headersFromParams.push({
  //     name: 'contentType',
  //     optional: false,
  //     originalName: 'Content-Type',
  //     type: 'string',
  //     value: op.contentTypes.join(', '),
  //   });
  // }

  return headersFromParams;
}

function getParams(
  params: ApiOperationParam[],
  options: ClientOptions,
  where?: string[]
): IOperationParam[] {
  if (!params || params.length < 1) {
    return [];
  }

  return params
    .filter((p) => !where || where.indexOf(p.in) > -1)
    .map((p) => ({
      originalName: p.name,
      name: getParamName(p.name),
      type: getParameterType(p, options),
      optional:
        p.required === undefined || p.required === null
          ? p['x-nullable'] === undefined || p['x-nullable'] === null
            ? true
            : !!p['x-nullable']
          : !p.required,
      original: p,
    }));
}

export function renderOperationGroup(
  group: any[],
  func: any,
  spec: ApiSpec,
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
