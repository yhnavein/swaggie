import type { ClientOptions } from '../../types';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

/**
 * Converts a parameter object to a TypeScript type.
 * @example
 * {
 *   name: 'title',
 *   in: 'query',
 *   required: false,
 *   schema: {
 *     type: 'string',
 *   },
 * } -> 'string'
 */
export function getParameterType(
  param: OA3.ParameterObject | OA3.MediaTypeObject,
  options: Partial<ClientOptions>
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!param) {
    return unknownType;
  }

  return getTypeFromSchema(param.schema, options);
}

function getTypeFromSchema(
  schema: OA3.SchemaObject | OA3.ReferenceObject,
  options: Partial<ClientOptions>
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!schema) {
    return unknownType;
  }
  if ('$ref' in schema) {
    const type = schema.$ref.split('/').pop();
    return handleGenerics(type || unknownType);
  }

  if (schema.type === 'array') {
    if (schema.items) {
      return `${getTypeFromSchema(schema.items, options)}[]`;
    }
    return `${unknownType}[]`;
  }
  if (schema.type === 'object') {
    if (schema.additionalProperties) {
      const extraProps = schema.additionalProperties;
      return `{ [key: string]: ${
        extraProps === true ? 'any' : getTypeFromSchema(extraProps, options)
      } }`;
    }
    return unknownType;
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    return 'number';
  }
  if (schema.type === 'string' && (schema.format === 'date-time' || schema.format === 'date')) {
    return options.dateFormat === 'string' ? 'string' : 'Date';
  }
  if (schema.type === 'string') {
    return schema.format === 'binary' ? 'File' : 'string';
  }
  if (schema.type === 'boolean') {
    return 'boolean';
  }
  return unknownType;
}

function handleGenerics(type: string) {
  if (!/^\w+\[\w+\]/.test(type)) {
    return type;
  }

  // const fixedType = type.replace(/\[/g, '<').replace(/\]/g, '>');
  const parts = type.split('[');
  return parts.join('<').replace(/\]/g, '>');
}
