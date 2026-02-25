import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';
import type { AppOptions, ClientOptions } from '../types';
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
  options: AppOptions
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!param) {
    return unknownType;
  }

  return getTypeFromSchemaResolved(param.schema, options);
}

/**
 * Converts a schema object (or a reference) to a TypeScript type.
 * @example
 * { type: 'number', format: 'int32' } -> 'number'
 * { $ref: '#/components/schema/User' } -> 'User'
 */
export function getTypeFromSchema(
  schema: OA3.SchemaObject | OA3.ReferenceObject | OA31.SchemaObject,
  options: AppOptions
): string {
  return getTypeFromSchemaResolved(schema, options);
}

/**
 * Internal implementation of getTypeFromSchema that operates on fully-resolved AppOptions.
 * All private functions in this module call this version directly to avoid redundant resolution.
 */
function getTypeFromSchemaResolved(
  schema: OA3.SchemaObject | OA3.ReferenceObject | OA31.SchemaObject,
  options: AppOptions
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!schema) {
    return unknownType;
  }

  if ('$ref' in schema) {
    const refName = schema.$ref.split('/').pop();
    return getSafeIdentifier(refName) || unknownType;
  }

  if (schema.type === 'null') {
    return 'null';
  }

  // OpenAPI 3.1 nullable: type is an array containing 'null', e.g. ["string", "null"]
  if (Array.isArray(schema.type)) {
    return getTypeFromOA31ArrayType(schema as OA31.SchemaObject, options);
  }

  // OpenAPI 3.0 nullable: nullable: true
  const isNullable = 'nullable' in schema && schema.nullable === true;
  const isNullableSuffix = isNullable && options.nullableStrategy === 'include' ? ' | null' : '';
  const type = getTypeFromSchemaInternal(schema, options);

  if (isNullableSuffix && type.endsWith('| null')) {
    return type;
  }
  return type + isNullableSuffix;
}

/**
 * Handles OpenAPI 3.1 schemas where `type` is an array (e.g. `["string", "null"]`).
 * The presence of `"null"` in the array is the OA3.1 way of marking a field as nullable.
 * Respects `nullableStrategy` the same way as OA3.0 `nullable: true`.
 */
function getTypeFromOA31ArrayType(schema: OA31.SchemaObject, options: AppOptions): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';
  const types = schema.type as string[];
  const isNullable = types.includes('null');
  const nonNullTypes = types.filter((t) => t !== 'null');

  // Build the base type from the non-null types
  let baseType: string;
  if (nonNullTypes.length === 0) {
    baseType = 'null';
  } else if (nonNullTypes.length === 1) {
    // Synthesize a single-type schema to reuse existing resolution logic
    const singleTypeSchema = { ...schema, type: nonNullTypes[0] } as OA31.SchemaObject;
    baseType = getTypeFromSchemaInternal(singleTypeSchema, options);
  } else {
    // Multiple non-null types — resolve each independently and join as a union
    baseType = nonNullTypes
      .map((t) => getTypeFromSchemaInternal({ ...schema, type: t } as OA31.SchemaObject, options))
      .join(' | ');
  }

  if (!isNullable) {
    return baseType || unknownType;
  }

  // All types were 'null' — just return 'null' regardless of strategy
  if (nonNullTypes.length === 0) {
    return 'null';
  }

  if (options.nullableStrategy === 'include') {
    // We don't want multiple nulls in the type string
    if (baseType.endsWith('| null')) {
      return baseType;
    }
    return `${baseType} | null`;
  }

  // 'ignore' and 'nullableAsOptional' — null is stripped from the type itself
  // (for nullableAsOptional, the optionality is applied at the property level in genTypes.ts)
  return baseType || unknownType;
}

function getTypeFromSchemaInternal(
  schema: OA3.SchemaObject | OA31.SchemaObject,
  options: AppOptions
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if ('allOf' in schema || 'oneOf' in schema || 'anyOf' in schema) {
    return getTypeFromComposites(schema as OA3.SchemaObject, options);
  }

  if (schema.type === 'array') {
    if (schema.items) {
      return `${getNestedTypeFromSchema(schema.items, options)}[]`;
    }
    return `${unknownType}[]`;
  }
  if (schema.type === 'object') {
    return getTypeFromObject(schema, options);
  }
  if ('enum' in schema) {
    return `${schema.enum.map((v) => JSON.stringify(v)).join(' | ')}`;
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

function getNestedTypeFromSchema(
  schema: OA3.SchemaObject | OA3.ReferenceObject | OA31.SchemaObject,
  options: AppOptions
): string {
  // OA3.0 nullable: true
  const isOA30NullableAndActive =
    'nullable' in schema && schema.nullable === true && options.nullableStrategy === 'include';

  // OA3.1 nullable: type array containing 'null'
  const isOA31NullableAndActive =
    'type' in schema &&
    Array.isArray(schema.type) &&
    schema.type.includes('null') &&
    options.nullableStrategy === 'include';

  if (isOA30NullableAndActive || isOA31NullableAndActive || ('enum' in schema && schema.enum)) {
    return `(${getTypeFromSchemaResolved(schema, options)})`;
  }

  return getTypeFromSchemaResolved(schema, options);
}

/**
 * Knowing that the schema is an object, this function returns a TypeScript type definition
 * for given schema object.
 */
function getTypeFromObject(
  schema: OA3.SchemaObject | OA31.SchemaObject,
  options: AppOptions
): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (schema.additionalProperties) {
    const extraProps = schema.additionalProperties;
    return `{ [key: string]: ${
      extraProps === true ? 'any' : getTypeFromSchemaResolved(extraProps, options)
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
        `${safePropName}${isRequired ? '' : '?'}: ${getTypeFromSchemaResolved(propDefinition, options)};`
      );
    }

    return `{ ${result.join('\n')} }`;
  }

  return unknownType;
}

/**
 * Simplified way of extracting correct type from `anyOf`, `oneOf` or `allOf` schema.
 */
function getTypeFromComposites(schema: OA3.SchemaObject, options: AppOptions): string {
  const composite = schema.allOf || schema.oneOf || schema.anyOf;

  return composite
    .map((s) => getTypeFromSchemaResolved(s, options))
    .join(schema.allOf ? ' & ' : ' | ');
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

/** Default values applied to every field of AppOptions that has a default. */
export const APP_DEFAULTS: Partial<AppOptions> = {
  template: 'axios',
  servicePrefix: '',
  nullableStrategy: 'ignore',
  queryParamsSerialization: {
    allowDots: true,
    arrayFormat: 'repeat',
  },
};

/**
 * Fills in all AppOptions defaults for a partial ClientOptions object.
 * Used at the boundary between public API / test helpers and the internal pipeline.
 */
export function resolveOptions(opts: Partial<ClientOptions>): AppOptions {
  return {
    src: opts.src ?? '',
    ...opts,
    template: opts.template ?? APP_DEFAULTS.template,
    servicePrefix: opts.servicePrefix ?? APP_DEFAULTS.servicePrefix,
    nullableStrategy: opts.nullableStrategy ?? APP_DEFAULTS.nullableStrategy,
    queryParamsSerialization: {
      ...APP_DEFAULTS.queryParamsSerialization,
      ...opts.queryParamsSerialization,
    },
  };
}
