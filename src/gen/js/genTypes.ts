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
  if ('oneOf' in schema && schema.type !== 'object') {
    result.push(renderOpenApi31Enum(name, schema));
    return result.join('\n');
  }

  const extensions = getTypeExtensions(schema);
  result.push(`export interface ${name} ${extensions}{`);

  if ('allOf' in schema) {
    const mergedSchema = getMergedAllOfObjects(schema);
    result.push(generateObjectTypeContents(mergedSchema, options));
  } else {
    result.push(generateObjectTypeContents(schema, options));
  }

  return `${result.join('\n')}}\n`;
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

// function renderTsInheritance(name: string, allOf: any[], options: ClientOptions) {
//   const ref = allOf[0];
//   const parentName = ref.$ref.split('/').pop();
//   const lines = renderTsType(name, allOf[1], options);
//   const interfaceLineIndex = lines.findIndex((l) => l.indexOf('export interface') === 0);
//   if (interfaceLineIndex > -1) {
//     // Let's replace generic interface definition with more specific one with inheritance info
//     lines[interfaceLineIndex] = `export interface ${name} extends ${parentName} {`;
//   }
//   return lines;
// }

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

function getTypeExtensions(schema: OA3.SchemaObject) {
  if ('allOf' in schema) {
    const refs = schema.allOf
      .filter((v) => '$ref' in v)
      .map((s: OA3.ReferenceObject) => s.$ref.split('/').pop());
    return `extends ${refs.join(', ')} `;
  }

  return '';
}

function getMergedAllOfObjects(schema: OA3.SchemaObject) {
  const subSchemas = schema.allOf.filter((v) => !('$ref' in v));

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
