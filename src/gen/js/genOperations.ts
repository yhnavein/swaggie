import { camelCase, last, orderBy } from 'lodash';

import { getTSParamType } from './support';
import {
  groupOperationsByGroupName,
  getBestResponse,
  escapeReservedWords,
} from '../util';
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
    const clientData = prepareClient(name, group, options);
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

function prepareOperations(operations: ApiOperation[], options: ClientOptions): IApiOperation[] {
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
      pathParams: getParams(op.parameters, options, ['path']),
      body: last(getParams(op.parameters, options, ['body'])),
      headers: getParams(op.parameters, options, ['header']),
    };
  });
}

/**
 * We will add numbers to the duplicated operation names to avoid breaking code
 * @param operations
 */
function fixDuplicateOperations(operations: ApiOperation[]): ApiOperation[] {
  if (!operations || operations.length < 2) {
    return operations;
  }

  const results = orderBy(operations, (o) => o.id);

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

function getOperationName(opId: string, group?: string) {
  if (!group) {
    return opId;
  }

  return camelCase(opId.replace(group + '_', ''));
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

export function renderParamSignature(
  op: ApiOperation,
  options: ClientOptions,
  pkg?: string
): string {
  const params = op.parameters;
  const required = params.filter((param) => param.required);
  const optional = params.filter((param) => !param.required);
  const funcParams = renderRequiredParamsSignature(required, options);
  const optParam = renderOptionalParamsSignature(op, optional, options, pkg);
  if (optParam.length) {
    funcParams.push(optParam);
  }

  return funcParams.map((p) => p.join(': ')).join(', ');
}

function renderRequiredParamsSignature(
  required: ApiOperationParam[],
  options: ClientOptions
): string[][] {
  return required.reduce<string[][]>((a, param) => {
    a.push(getParamSignature(param, options));
    return a;
  }, []);
}

function renderOptionalParamsSignature(
  op: ApiOperation,
  optional: ApiOperationParam[],
  options: ClientOptions,
  pkg?: string
) {
  if (!optional.length) {
    return [];
  }
  if (!pkg) {
    pkg = '';
  }
  const s = '?';
  const param = [`options${s}`];

  param.push(`${pkg}${op.id[0].toUpperCase() + op.id.slice(1)}Options`);
  return param;
}

function getParamSignature(param: ApiOperationParam, options: ClientOptions): string[] {
  const signature = [getParamName(param.name)];

  signature.push(getTSParamType(param, options));

  return signature;
}

export function getParamName(name: string): string {
  return escapeReservedWords(camelCase(name));
}
