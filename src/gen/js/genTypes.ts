import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';

import { getTypeFromSchema } from './support';
import type { ClientOptions } from '../../types';

/**
 * Generates TypeScript types for the given OpenAPI 3 document.
 * @returns String containing all TypeScript types in the document.
 */
export default function genTypes(spec: OA3.Document, options: ClientOptions): string {
  const result: string[] = [];

  const schemaKeys = Object.keys(spec.components?.schemas || {});
  if (schemaKeys.length === 0) {
    return '';
  }

  for (const schemaName of schemaKeys) {
    const schema = spec.components.schemas[schemaName];
    result.push(renderType(schemaName, schema, options));
  }

  return result.join('\n');
}

function renderType(
  name: string,
  schema: OA3.ReferenceObject | OA3.SchemaObject,
  options: ClientOptions
): string {
  // This is an interesting case, because it is allowed but not likely to be used
  // as it is just a reference to another schema object
  if ('$ref' in schema) {
    return `export type ${name} = ${schema.$ref.split('/').pop()};`;
  }

  const result: string[] = [];
  if (schema.description) {
    result.push(renderComment(schema.description));
  }

  if ('x-enumNames' in schema || 'x-enum-varnames' in schema) {
    result.push(renderExtendedEnumType(name, schema));
    return result.join('\n');
  }
  if ('enum' in schema) {
    result.push(renderEnumType(name, schema));
    return result.join('\n');
  }

  // OpenAPI 3.1 enums support. We need to check if the schema is an object and has a oneOf property
  if ('oneOf' in schema && schema.type !== 'object' && schema.type) {
    result.push(renderOpenApi31Enum(name, schema));
    return result.join('\n');
  }

  if ('allOf' in schema) {
    const types = getCompositeTypes(schema);
    const extensions = types ? `extends ${types.join(', ')} ` : '';
    result.push(`export interface ${name} ${extensions}{`);

    const mergedSchema = getMergedCompositeObjects(schema);
    result.push(generateObjectTypeContents(mergedSchema, options));
  } else if ('oneOf' in schema || 'anyOf' in schema) {
    const typeDefinition = getTypesFromAnyOrOneOf(schema, options);
    result.push(`export type ${name} = ${typeDefinition};`);

    return `${result.join('\n')}\n`;
  } else {
    result.push(`export interface ${name} {`);
    result.push(generateObjectTypeContents(schema, options));
  }

  return `${result.join('\n')}}\n`;
}

function getTypesFromAnyOrOneOf(schema: OA3.SchemaObject, options: ClientOptions) {
  const types = getCompositeTypes(schema);
  const mergedSchema = getMergedCompositeObjects(schema);
  const typeContents = generateObjectTypeContents(mergedSchema, options);
  if (typeContents) {
    types.push(`{ ${typeContents} }`);
  }

  return types.join(' | ');
}

function generateObjectTypeContents(schema: OA3.SchemaObject, options: ClientOptions) {
  const result: string[] = [];
  const required = schema.required || [];
  const props = Object.keys(schema.properties || {});

  for (const prop of props) {
    const propDefinition = schema.properties[prop];
    const isRequired = !!~required.indexOf(prop);
    result.push(renderTsTypeProp(prop, propDefinition, isRequired, options));
  }

  return result.join('\n');
}

/**
 * NSwag (or OpenAPI Generator) can generate enums with custom names for each value.
 * We support `x-enumNames` or `x-enum-varnames` for this feature.
 */
function renderExtendedEnumType(name: string, def: OA3.SchemaObject) {
  const isString = def.type === 'string';
  let res = `export enum ${name} {\n`;
  const enumNames: string[] = def['x-enumNames'] ?? def['x-enum-varnames'];
  const enumValues = def.enum.map((el) => (isString ? `"${el}"` : el));

  for (let index = 0; index < enumNames.length; index++) {
    res += `  ${enumNames[index]} = ${enumValues[index]},\n`;
  }
  return `${res}}\n`;
}

/**
 * Render simple enum types (just a union of values)
 */
function renderEnumType(name: string, def: OA3.SchemaObject) {
  const values = def.enum.map((v) => (typeof v === 'number' ? v : `"${v}"`)).join(' | ');
  return `export type ${name} = ${values};\n`;
}

/**
 * OpenApi 3.1 introduced a new way to define enums that we support here.
 */
function renderOpenApi31Enum(name: string, def: OA31.SchemaObject) {
  let res = `export enum ${name} {\n`;
  for (const v of def.oneOf) {
    if ('const' in v) {
      res += `  ${v.title} = ${typeof v.const === 'string' ? `"${v.const}"` : v.const},\n`;
    }
  }

  return `${res}}\n`;
}

function renderTsTypeProp(
  prop: string,
  definition: OA3.ReferenceObject | OA3.SchemaObject,
  required: boolean,
  options: ClientOptions
): string {
  const lines: string[] = [];
  const type = getTypeFromSchema(definition, options);

  if ('description' in definition) {
    lines.push(renderComment(definition.description));
  }
  const optionalMark = required ? '' : '?';
  lines.push(`  ${prop}${optionalMark}: ${type};`);

  return lines.join('\n');
}

export function renderComment(comment: string | null) {
  if (!comment) {
    return null;
  }

  const commentLines = comment.split('\n');

  if (commentLines.length === 1) {
    return `// ${comment.trim()}`;
  }

  return ` /**\n${commentLines.map((line) => `  * ${line.trim()}`).join('\n')}\n  */`;
}

/**
 * Returns a string with the types that the given schema extends.
 * It uses the `allOf`, `oneOf` or `anyOf` properties to determine the types.
 * If the schema has no composite types, it returns an empty string.
 * If there are more than one composite types, it analyzes only the first one.
 */
function getCompositeTypes(schema: OA3.SchemaObject) {
  const composite = schema.allOf || schema.oneOf || schema.anyOf || [];
  if (composite) {
    return composite
      .filter((v) => '$ref' in v)
      .map((s: OA3.ReferenceObject) => s.$ref.split('/').pop());
  }

  return [];
}

function getMergedCompositeObjects(schema: OA3.SchemaObject) {
  const composite = schema.allOf || schema.oneOf || schema.anyOf || [];
  const subSchemas = composite.filter((v) => !('$ref' in v));

  return deepMerge({}, ...subSchemas);
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}
function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else if (Array.isArray(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: source[key] });
        } else if (Array.isArray(target[key])) {
          (target[key] as any[]) = Array.from(new Set([...target[key], ...source[key]]));
        }
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}
