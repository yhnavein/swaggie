import { camelCase, last, orderBy } from 'lodash';

import { getTSParamType } from './support';
import { groupOperationsByGroupName, getBestResponse, escapeReservedWords } from '../util';
import { IServiceClient, IApiOperation, IOperationParam } from './models';
import { generateBarrelFile } from './createBarrel';
import { renderFile } from '../templateManager';

export default function genOperations(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
) {
  const groups = groupOperationsByGroupName(operations);
  let result = renderFile('baseClient.ejs', {
    reactContexts: options.reactHooks || false,
  });

  // tslint:disable-next-line:forin prefer-const
  for (let name in groups) {
    const group = groups[name];
    const clientData = prepareClient((options.servicePrefix || '') + name, group, options);
    result += renderFile('client.ejs', clientData);
  }

  result += generateBarrelFile(groups, options);

  return result;
}

function prepareClient(
  name: string,
  operations: ApiOperation[],
  options: ClientOptions
): IServiceClient {
  return {
    clientName: name,
    operations: prepareOperations(operations, options),
    baseUrl: options.baseUrl,
  };
}

export function prepareOperations(
  operations: ApiOperation[],
  options: ClientOptions
): IApiOperation[] {
  const ops = fixDuplicateOperations(operations);

  return ops.map((op) => {
    const response = getBestResponse(op);
    const respType = getTSParamType(response, options);

    return {
      returnType: respType,
      method: op.method.toUpperCase(),
      name: getOperationName(op.id, op.group),
      url: op.path,
      parameters: getParams(op.parameters, options),
      query: getParams(op.parameters, options, ['query']),
      formData: getParams(op.parameters, options, ['formData']),
      pathParams: getParams(op.parameters, options, ['path']),
      body: last(getParams(op.parameters, options, ['body'])),
      headers: getHeaders(op, options),
    };
  });
}

/**
 * We will add numbers to the duplicated operation names to avoid breaking code
 * @param operations
 */
export function fixDuplicateOperations(operations: ApiOperation[]): ApiOperation[] {
  if (!operations || operations.length < 2) {
    return operations;
  }

  const ops = operations.map((a) => Object.assign({}, a));
  const results = orderBy(ops, (o) => o.id);

  let inc = 0;
  let prevOpId = results[0].id;
  for (let i = 1; i < results.length; i++) {
    if (results[i].id === prevOpId) {
      results[i].id += (++inc).toString();
    } else {
      inc = 0;
      prevOpId = results[i].id;
    }
  }

  return results;
}

export function getOperationName(opId: string, group?: string) {
  if (!opId) {
    return '';
  }
  if (!group) {
    return opId;
  }

  return camelCase(opId.replace(group + '_', ''));
}

function getHeaders(op: ApiOperation, options: ClientOptions): IOperationParam[] {
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
      type: getTSParamType(p, options),
      optional: !p.required,
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

export function getParamName(name: string): string {
  return escapeReservedWords(camelCase(name));
}
