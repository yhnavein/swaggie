import type { ClientOptions } from '../types';
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

/**
 * Converts a schema object (or a reference) to a TypeScript type.
 * @example
 * { type: 'number', format: 'int32' } -> 'number'
 * { $ref: '#/components/schema/User' } -> 'User'
 */
export function getTypeFromSchema(
  schema: OA3.SchemaObject | OA3.ReferenceObject,
  options: Partial<ClientOptions>
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!schema) {
    return unknownType;
  }

  if ('$ref' in schema) {
    const refName = schema.$ref.split('/').pop();
    return getSafeIdentifier(refName) || unknownType;
  }

  if ('allOf' in schema || 'oneOf' in schema || 'anyOf' in schema) {
    return getTypeFromComposites(schema, options);
  }

  if (schema.type === 'array') {
    if (schema.items) {
      return `${getTypeFromSchema(schema.items, options)}[]`;
    }
    return `${unknownType}[]`;
  }
  if (schema.type === 'object') {
    return getTypeFromObject(schema, options);
  }

  if ('enum' in schema) {
    return `(${schema.enum.map((v) => JSON.stringify(v)).join(' | ')})`;
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

/**
 * Knowing that the schema is an object, this function returns a TypeScript type definition
 * for given schema object.
 */
function getTypeFromObject(schema: OA3.SchemaObject, options: Partial<ClientOptions>): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (schema.additionalProperties) {
    const extraProps = schema.additionalProperties;
    return `{ [key: string]: ${
      extraProps === true ? 'any' : getTypeFromSchema(extraProps, options)
    } }`;
  }

  if (schema.properties) {
    const props = Object.keys(schema.properties);
    const required = schema.required || [];
    const result: string[] = [];

    for (const prop of props) {
      const propDefinition = schema.properties[prop];
      const isRequired = required.includes(prop);
      result.push(
        `${prop}${isRequired ? '' : '?'}: ${getTypeFromSchema(propDefinition, options)};`
      );
    }

    return `{ ${result.join('\n')} }`;
  }

  return unknownType;
}

/**
 * Simplified way of extracting correct type from `anyOf`, `oneOf` or `allOf` schema.
 * For now we support only reference objects and in those composites (most common case)
 */
function getTypeFromComposites(schema: OA3.SchemaObject, options: Partial<ClientOptions>): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  const types = getCompositeTypes(schema);

  if (types.length === 0) {
    return unknownType;
  }

  return schema.allOf ? types.join(' & ') : types.join(' | ');
}

/**
 * Escapes name so it can be used as a valid identifier in the generated code.
 * Component names can contain certain characters that are not allowed in identifiers.
 * For example, `-` is not allowed in TypeScript, but it is allowed in OpenAPI.
 */
export function getSafeIdentifier(name: string | undefined) {
  if (!name) {
    return '';
  }

  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Returns a string with the types that the given schema extends.
 * It uses the `allOf`, `oneOf` or `anyOf` properties to determine the types.
 * If the schema has no composite types, it returns an empty string.
 * If there are more than one composite types, then `allOf` is preferred
 * over `oneOf` and `anyOf`. Only first type is considered.
 */
export function getCompositeTypes(schema: OA3.SchemaObject) {
  const composite = schema.allOf || schema.oneOf || schema.anyOf || [];
  if (composite) {
    return composite
      .filter((v) => '$ref' in v)
      .map((s: OA3.ReferenceObject) => getSafeIdentifier(s.$ref.split('/').pop()));
  }

  return [];
}
