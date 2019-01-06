import {
  saveAndPrettifyFile,
  join,
  groupOperationsByGroupName,
  camelToUppercase,
  getBestResponse,
} from '../util';
import { DOC, SP, ST, getDocType, getTSParamType } from './support';
import { renderParamSignature, renderOperationGroup, getParamName } from './genOperations';

export default function genReduxActions(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
) {
  const files = genReduxActionGroupFiles(spec, operations, options);
  files.forEach((file) => saveAndPrettifyFile(file.path, file.contents));
}

export function genReduxActionGroupFiles(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
) {
  const groups = groupOperationsByGroupName(operations);
  const files = [];

  // tslint:disable-next-line:forin prefer-const
  for (let name in groups) {
    const group = groups[name];
    const lines = [];
    lines.push(renderHeader(name, spec, options));
    lines.push(renderOperationGroup(group, renderReduxActionBlock, spec, options));
    files.push({
      path: `${options.outDir}/action/${name}.ts`,
      contents: lines.join('\n'),
    });
  }
  return files;
}

function renderHeader(name: string, spec: ApiSpec, options: ClientOptions): string {
  const code = `
  // Auto-generated, edits will be overwritten
import * as ${name} from '../${name}'${ST}
`.trim();
  return code;
}

function renderReduxActionBlock(spec: ApiSpec, op: ApiOperation, options: ClientOptions): string {
  const actionStart = camelToUppercase(op.id) + '_START';
  const actionComplete = camelToUppercase(op.id);
  const infoParam = 'info?: any';
  let paramSignature = renderParamSignature(op, options, `${op.group}.`);
  paramSignature += `${paramSignature ? ', ' : ''}${infoParam}`;
  const required = op.parameters.filter((param) => param.required);
  let params = required.map((param) => getParamName(param.name)).join(', ');
  if (required.length < op.parameters.length) {
    if (required.length) {
      params += ', options';
    } else {
      params = 'options';
    }
  }

  const response = getBestResponse(op);
  const returnType = response ? getTSParamType(response) : 'any';
  return `
export const ${actionStart} = 's/${op.group}/${actionStart}'${ST}
export const ${actionComplete} = 's/${op.group}/${actionComplete}'${ST}
export type ${actionComplete} = ${returnType}${ST}

export function ${op.id}(${paramSignature}): any {
  return dispatch => {
    dispatch({ type: ${actionStart}, meta: { info } })${ST}
    return ${op.group}.${op.id}(${params})
      .then(response => dispatch({
        type: ${actionComplete},
        payload: response.data,
        error: response.error,
        meta: {
          res: response.raw,
          info
        }
      }))${ST}
  }${ST}
}
`.replace(/  /g, SP);
}
