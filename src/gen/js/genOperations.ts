import { writeFileSync, join, groupOperationsByGroupName, getBestResponse } from '../util';
import { DOC, SP, ST, getTSParamType } from './support';

import * as ejs from 'ejs';
import { camelCase } from 'lodash';

export default function genOperations(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
) {
  genOperationGroupFiles(spec, operations, options);
  // files.forEach((file) => writeFileSync(file.path, file.contents));
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
    ejs.renderFile(process.cwd() + '\\templates\\axios\\client.ejs', clientData, (err, str) => {
      const path = `${options.outDir}/${name}.ts`;
      const contents = str;

      writeFileSync(path, contents);
    });
    // const lines = [];
    // join(lines, renderHeader(name, spec, options));
    // join(lines, renderOperationGroup(group, renderOperation, spec, options));
    // join(lines, renderOperationGroup(group, renderOperationInfo, spec, options));
    // join(lines, ['}']);
    // join(lines, renderOperationGroup(group, renderOperationParamType, spec, options));
  }
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
      name: getOperationName(op.id, op.group),
      url: op.path,
      parameters: op.parameters,
    };
  });
}

function getOperationName(opId: string, group?: string) {
  if (!group) {
    return opId;
  }

  return camelCase(opId.replace(group + '_', ''));
}

function renderHeader(groupName: string, spec: ApiSpec, options: ClientOptions): string[] {
  const lines = [];
  lines.push(`/* tslint:disable */`);
  lines.push(`// Auto-generated, edits will be overwritten`);
  lines.push(`import * as types from './types'${ST}`);
  lines.push(`import * as gateway from './gateway'${ST}`);
  lines.push('');
  lines.push(`export class ${groupName}Client {`);
  return lines;
}

export function renderOperationGroup(
  group: any[],
  func: any,
  spec: ApiSpec,
  options: ClientOptions
): string[] {
  return group.map((op) => func.call(this, spec, op, options)).reduce((a, b) => a.concat(b));
}

function renderOperation(spec: ApiSpec, op: ApiOperation, options: ClientOptions): string[] {
  const lines = [];
  // join(lines, renderOperationDocs(op));
  join(lines, renderOperationBlock(spec, op, options));
  return lines;
}

function renderOperationBlock(spec: ApiSpec, op: ApiOperation, options: ClientOptions): string[] {
  const lines = [];
  join(lines, renderOperationSignature(op, options));
  join(lines, renderOperationObject(spec, op, options));
  join(lines, renderRequestCall(op, options));
  lines.push('');
  return lines;
}

function renderOperationSignature(op: ApiOperation, options: ClientOptions): string[] {
  const paramSignature = renderParamSignature(op, options);
  const rtnSignature = renderReturnSignature(op, options);
  return [`${SP}${op.id}(${paramSignature})${rtnSignature} {`];
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

function renderReturnSignature(op: ApiOperation, options: ClientOptions): string {
  const response = getBestResponse(op);
  return `: Promise<types.Response<${getTSParamType(response, true)}>>`;
}

function getParamSignature(param: ApiOperationParam, options: ClientOptions): string[] {
  const signature = [getParamName(param.name)];

  signature.push(getTSParamType(param, true));

  return signature;
}

export function getParamName(name: string): string {
  const parts = name.split(/[_-\s!@\#$%^&*\(\)]/g).filter((n) => !!n);
  const reduced = parts.reduce((name, p) => `${name}${p[0].toUpperCase()}${p.slice(1)}`);
  return escapeReservedWords(reduced);
}

function escapeReservedWords(name: string): string {
  let escapedName = name;

  const reservedWords = [
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ];

  if (reservedWords.indexOf(name) >= 0) {
    escapedName = name + '_';
  }
  return escapedName;
}

function renderOperationObject(spec: ApiSpec, op: ApiOperation, options: ClientOptions): string[] {
  const lines = [];
  const parameters = op.parameters.reduce(groupParams, {});
  const names = Object.keys(parameters);
  const last = names.length - 1;
  names.forEach((name, i) => {
    join(lines, renderParamGroup(name, parameters[name], i === last));
  });

  if (lines.length) {
    lines.unshift(`${SP}${SP}const parameters: types.OperationParamGroups = {`);

    lines.push(`${SP}${SP}}${ST}`);
    const hasOptionals = op.parameters.some((op) => !op.required);
    if (hasOptionals) {
      lines.unshift(`${SP}${SP}if (!options) options = {}${ST}`);
    }
  }
  return lines;
}

function groupParams(groups: any, param: ApiOperationParam): any {
  const group = groups[param.in] || [];
  const name = getParamName(param.name);
  const realName = /^[_$a-z0-9]+$/gim.test(param.name) ? param.name : `'${param.name}'`;
  const value = param.required ? name : 'options.' + name;

  if (param.type === 'array') {
    if (!param.collectionFormat) {
      throw new Error(`param ${param.name} must specify an array collectionFormat`);
    }
    const str = `gateway.formatArrayParam(${value}, '${param.collectionFormat}', '${param.name}')`;
    group.push(`${SP.repeat(3)}${realName}: ${str}`);
  } else if (param.format === 'date' || param.format === 'date-time') {
    const str = `gateway.formatDate(${value}, '${param.format}')`;
    group.push(`${SP.repeat(3)}${realName}: ${str}`);
  } else if (param.required && param.name === name && name === realName) {
    group.push(`${SP.repeat(3)}${realName}`);
  } else {
    group.push(`${SP.repeat(3)}${realName}: ${value}`);
  }
  groups[param.in] = group;
  return groups;
}

function renderParamGroup(name: string, groupLines: string[], last: boolean): string[] {
  const lines = [];
  lines.push(`${SP.repeat(2)}${name}: {`);
  join(lines, groupLines.join(',\n').split('\n'));
  lines.push(`${SP.repeat(2)}}${last ? '' : ','}`);
  return lines;
}

function renderRequestCall(op: ApiOperation, options: ClientOptions) {
  const params = op.parameters.length ? ', parameters' : '';
  return [`${SP}${SP}return gateway.request(this.${op.id}Operation${params})${ST}`, SP + '}'];
}

function renderOperationParamType(
  spec: ApiSpec,
  op: ApiOperation,
  options: ClientOptions
): string[] {
  const optional = op.parameters.filter((param) => !param.required);
  if (!optional.length) {
    return [];
  }
  const lines = [];
  lines.push(`export interface ${op.id[0].toUpperCase() + op.id.slice(1)}Options {`);
  optional.forEach((param) => {
    if (param.description) {
      lines.push(`${SP}/**`);
      lines.push(
        `${SP}${DOC}` + (param.description || '').trim().replace(/\n/g, `\n${SP}${DOC}${SP}`)
      );
      lines.push(`${SP} */`);
    }
    lines.push(`${SP}${getParamName(param.name)}?: ${getTSParamType(param)}${ST}`);
  });
  lines.push('}');
  lines.push('');
  return lines;
}

// We could just JSON.stringify this stuff but want it looking as if typed by developer
function renderOperationInfo(spec: ApiSpec, op: ApiOperation, options: ClientOptions): string[] {
  const lines = [];
  lines.push(`${SP}${op.id}Operation: types.OperationInfo = {`);

  lines.push(`${SP}${SP}path: '${op.path}',`);

  const hasBody = op.parameters.some((p) => p.in === 'body');
  if (hasBody && op.contentTypes.length) {
    lines.push(`${SP}${SP}contentTypes: ['${op.contentTypes.join(`','`)}'],`);
  }
  lines.push(`${SP}${SP}method: '${op.method}'${op.security ? ',' : ''}`);
  if (op.security && op.security.length) {
    const secLines = renderSecurityInfo(op.security);
    lines.push(`${SP}${SP}security: [`);
    join(lines, secLines);
    lines.push(`${SP}${SP}]`);
  }
  lines.push(`${SP}}${ST}`);
  lines.push('');
  return lines;
}

function renderSecurityInfo(security: ApiOperationSecurity[]): string[] {
  return security
    .map((sec, i) => {
      const scopes = sec.scopes;
      const secLines = [];
      secLines.push(`${SP.repeat(2)}{`);
      secLines.push(`${SP.repeat(3)}id: '${sec.id}'${scopes ? ',' : ''}`);
      if (scopes) {
        secLines.push(`${SP.repeat(3)}scopes: ['${scopes.join(`', '`)}']`);
      }
      secLines.push(`${SP.repeat(2)}}${i + 1 < security.length ? ',' : ''}`);
      return secLines;
    })
    .reduce((a, b) => a.concat(b));
}

export interface IApiOperation {
  returnType: string;
  name: string;
  url: string;
  parameters: ApiOperationParam[];
}

// export interface IOperationParam {
//   name: string;
//   type: string;
//   optional: boolean;
// }

export interface IServiceClient {
  clientName: string;
  operations: IApiOperation[];
}
