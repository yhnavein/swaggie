import { OpenAPIV3 as OA3 } from 'openapi-types';
import { camelCase, upperFirst } from 'lodash';
import { escapeReservedWords } from './utils';

const models: Model[] = [];

export default function (spec: OA3.Document) {
  function getAllModels() {
    return spec.components.schemas;
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
