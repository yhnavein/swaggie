import { OpenAPIV3 as OA3 } from 'openapi-types';
import { camelCase, upperFirst } from 'lodash';
import { escapeReservedWords } from './utils';

const models: Model[] = [];

export default function (spec: OA3.Document) {
  function getAllModels() {
    return spec.components.schemas;
  }

  function getQueryModels(): Model[] {
    Object.keys(spec.paths).map((key) => {
      const el = spec.paths[key];
      const queryParams = el.parameters!.filter((p: OA3.ParameterObject) => p.in === 'query');

      if (!queryParams || queryParams.length <= 1) {
        return null;
      }

      const params = queryParams.map((q: OA3.ParameterObject) => ({ name: q.name, ...q.schema }));
      return {
        name: ``,
        type: 'object',
        additionalProperties: false,
        properties: params.reduce((obj, item) => Object.assign(obj, { [item.name]: item }), {}),
      } as OA3.NonArraySchemaObject;
    });
    return [];
  }

  function handleGenericTypes(): Model[] {
    return [];
  }
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

interface Model {
  name: string;
  identifier: string;
  params: (OA3.SchemaObject | OA3.ReferenceObject)[];
}
