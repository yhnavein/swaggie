import type { ClientOptions } from '../types';
import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';
import { escapePropName } from '../utils';

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
  schema: OA3.SchemaObject | OA3.ReferenceObject | OA31.SchemaObject,
  options: Partial<ClientOptions>
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!schema) {
    return unknownType;
  }

  const isNullableSuffix = 'nullable' in schema && schema.nullable === true ? ' | null' : '';
  if ('$ref' in schema) {
    const refName = schema.$ref.split('/').pop();
    return (getSafeIdentifier(refName) || unknownType) + isNullableSuffix;
  }

  if ('allOf' in schema || 'oneOf' in schema || 'anyOf' in schema) {
    return getTypeFromComposites(schema as OA3.SchemaObject, options);
  }

  if (schema.type === 'array') {
    if (schema.items) {
      return `${getNestedTypeFromSchema(schema.items, options)}[]${isNullableSuffix}`;
    }
    return `${unknownType}[]${isNullableSuffix}`;
  }
  if (schema.type === 'object') {
    return getTypeFromObject(schema, options) + isNullableSuffix;
  }
  if (schema.type === 'null') {
    return 'null';
  }

  if ('enum' in schema) {
    return `${schema.enum.map((v) => JSON.stringify(v)).join(' | ')}${isNullableSuffix}`;
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    return 'number' + isNullableSuffix;
  }
  if (schema.type === 'string' && (schema.format === 'date-time' || schema.format === 'date')) {
    return (options.dateFormat === 'string' ? 'string' : 'Date') + isNullableSuffix;
  }
  if (schema.type === 'string') {
    return (schema.format === 'binary' ? 'File' : 'string') + isNullableSuffix;
  }
  if (schema.type === 'boolean') {
    return 'boolean' + isNullableSuffix;
  }
  return unknownType;
}

function getNestedTypeFromSchema(
  schema: OA3.SchemaObject | OA3.ReferenceObject | OA31.SchemaObject,
  options: Partial<ClientOptions>
): string {
  if (('nullable' in schema && schema.nullable === true) || ('enum' in schema && schema.enum)) {
    return `(${getTypeFromSchema(schema, options)})`;
  }
  return getTypeFromSchema(schema, options);
}

/**
 * Knowing that the schema is an object, this function returns a TypeScript type definition
 * for given schema object.
 */
function getTypeFromObject(
  schema: OA3.SchemaObject | OA31.SchemaObject,
  options: Partial<ClientOptions>
): string {
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
      const safePropName = escapePropName(prop);
      result.push(
        `${safePropName}${isRequired ? '' : '?'}: ${getTypeFromSchema(propDefinition, options)};`
      );
    }

    return `{ ${result.join('\n')} }`;
  }

  return unknownType;
}

/**
 * Simplified way of extracting correct type from `anyOf`, `oneOf` or `allOf` schema.
 */
function getTypeFromComposites(schema: OA3.SchemaObject, options: Partial<ClientOptions>): string {
  const composite = schema.allOf || schema.oneOf || schema.anyOf;

  return composite.map((s) => getTypeFromSchema(s, options)).join(schema.allOf ? ' & ' : ' | ');
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
 * Returns a string with the reference types that the given schema extends.
 * It is used only for `allOf` property, as it enforces extending types.
 */
export function getRefCompositeTypes(schema: OA3.SchemaObject) {
  return schema.allOf
    .filter((v) => '$ref' in v)
    .map((s: OA3.ReferenceObject) => getSafeIdentifier(s.$ref.split('/').pop()));
}
