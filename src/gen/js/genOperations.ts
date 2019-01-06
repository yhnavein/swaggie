import * as ejs from 'ejs';
import * as path from 'path';
import { camelCase, last } from 'lodash';

import { getTSParamType } from './support';
import {
  saveAndPrettifyFile,
  groupOperationsByGroupName,
  getBestResponse,
  escapeReservedWords,
} from '../util';
import { IServiceClient, IApiOperation, IOperationParam } from './models';

export default function genOperations(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
) {
  genOperationGroupFiles(spec, operations, options);
}

export function genOperationGroupFiles(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
) {
  const groups = groupOperationsByGroupName(operations);
  // tslint:disable-next-line:forin prefer-const
  for (let name in groups) {
    const group = groups[name];
    const clientData = prepareClient(name, group);
    const absPath = path.join(process.cwd(), 'templates', 'axios', 'client.ejs');

    ejs.renderFile(absPath, clientData, (err, str) => {
      if (err) {
        console.error(err);
      }
      const path = `${options.outDir}/${name}.ts`;
      const contents = str;

      saveAndPrettifyFile(path, contents);
    });
  }

  createBarrelFile(groups, `${options.outDir}/index.ts`);
}

function createBarrelFile(clients: any[], path: string) {
  const files = ['types'];

  // tslint:disable-next-line:forin prefer-const
  for (let name in clients) {
    files.push(name);
  }

  const contents = files.map((f) => `export * from './${f}';`).join('\n');

  saveAndPrettifyFile(path, contents);
}

function prepareClient(name: string, operations: ApiOperation[]): IServiceClient {
  return {
    clientName: name,
    operations: prepareOperations(operations),
  };
}

function prepareOperations(operations: ApiOperation[]): IApiOperation[] {
  return operations.map((op) => {
    const response = getBestResponse(op);
    const respType = getTSParamType(response, true);

    return {
      returnType: respType,
      method: op.method.toUpperCase(),
      name: getOperationName(op.id, op.group),
      url: op.path,
      parameters: getParams(op.parameters),
      query: getParams(op.parameters, ['query', 'path']),
      body: last(getParams(op.parameters, ['body'])),
      headers: getParams(op.parameters, ['header']),
    };
  });
}

function getOperationName(opId: string, group?: string) {
  if (!group) {
    return opId;
  }

  return camelCase(opId.replace(group + '_', ''));
}

function getParams(params: ApiOperationParam[], where?: string[]): IOperationParam[] {
  if (!params || params.length < 1) {
    return [];
  }

  return params
    .filter((p) => !where || where.indexOf(p.in) > -1)
    .map((p) => ({
      originalName: p.name,
      name: getParamName(p.name),
      type: getTSParamType(p, true),
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

  signature.push(getTSParamType(param, true));

  return signature;
}

export function getParamName(name: string): string {
  return escapeReservedWords(camelCase(name));
}
