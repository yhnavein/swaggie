import { OpenAPIV3 as OA3 } from 'openapi-types';
import { camelCase, upperFirst, flatten } from 'lodash';
import { escapeReservedWords } from './';

const verbs = ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'TRACE'];

// TODO: Merge with path-level parameters
export function getQueryModels(spec: OA3.Document) {
  const res = Object.keys(spec.paths).map((key) => {
    const el = spec.paths[key];
    return Object.keys(el)
      .filter((verb) => verbs.indexOf(verb.toUpperCase()) > -1)
      .map((verb) => {
        const operation = el[verb] as OA3.OperationObject;
        const queryParams = operation.parameters!.filter(
          (p: OA3.ParameterObject) => p.in === 'query'
        );

        if (!queryParams || queryParams.length <= 1) {
          return null;
        }

        const params = queryParams.map((q: OA3.ParameterObject) => ({ name: q.name, ...q.schema }));
        return {
          name: `I${upperFirst(getOperationName(operation.operationId))}ServiceQuery`,
          type: 'object',
          additionalProperties: false,
          properties: params.reduce((obj, item) => Object.assign(obj, { [item.name]: item }), {}),
        } as QuerySchemaObject;
      });
  });
  return flatten(res).filter((e) => e);
}

export function getParamName(name: string): string {
  return escapeReservedWords(
    name
      .split('.')
      .map((x) => camelCase(x))
      .join('_')
  );
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

export interface QuerySchemaObject extends OA3.NonArraySchemaObject {
  name: string;
}
