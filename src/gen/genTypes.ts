import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';

import { getRefCompositeTypes, getSafeIdentifier, getTypeFromSchema } from '../swagger';
import type { AppOptions } from '../types';
import { escapePropName } from '../utils/utils';
import { findAllUsedRefs } from './refsHelper';
import { renderComment } from './jsDocs';

/**
 * Generates TypeScript code with all the types for the given OpenAPI 3 document.
 * This function will also traverse all the spec to see if the types are actually used.
 * Circular dependencies will mark the types as used - this is acknowledged.
 * @returns String containing all TypeScript types in the document.
 */
export default function generateTypes(
  spec: OA3.Document,
  options: AppOptions,
  skipUnused: boolean = true
): string {
  const result: string[] = [];

  const schemaKeys = Object.keys(spec.components?.schemas || {});
  if (schemaKeys.length === 0) {
    return '';
  }

  const usedRefs = new Set<string>();
  if (skipUnused) {
    findAllUsedRefs(spec, options, usedRefs);
  }

  for (const schemaName of schemaKeys) {
    if (skipUnused && !usedRefs.has(schemaName)) {
      continue;
    }

    const schema = spec.components.schemas[schemaName];
    result.push(renderSchema(schemaName, schema, options));
  }

  return result.join('\n');
}

function renderSchema(
  name: string,
  schema: OA3.ReferenceObject | OA3.SchemaObject,
  options: AppOptions
): string {
  const useTypeAliases = options.schemaDeclarationStyle === 'type';
  const safeName = getSafeIdentifier(name);
  if (!safeName) {
    console.warn(`Skipping schema ${name} because it is not a valid identifier`);
    return '';
  }

  // x-ts-type takes precedence over everything, including $ref.
  // When present, emit the literal TypeScript type string verbatim.
  if ('x-ts-type' in schema) {
    const result: string[] = [];
    const s = schema as OA3.SchemaObject;
    if (s.description ?? s.title) {
      result.push(renderComment(s.description ?? s.title));
    }
    result.push(`export type ${safeName} = ${schema['x-ts-type']};`);
    return result.join('\n');
  }

  // This is an interesting case, because it is allowed but not likely to be used
  // as it is just a reference to another schema object
  if ('$ref' in schema) {
    const refName = getSafeIdentifier(schema.$ref.split('/').pop());
    return `export type ${safeName} = ${refName || 'unknown'};`;
  }

  const result: string[] = [];
  const schemaContext = `components.schemas.${safeName}`;
  if (schema.description ?? schema.title) {
    result.push(renderComment(schema.description ?? schema.title));
  }

  if ('x-enumNames' in schema || 'x-enum-varnames' in schema) {
    result.push(renderExtendedEnumType(safeName, schema));
    return result.join('\n');
  }
  if ('enum' in schema) {
    result.push(renderEnumType(safeName, schema, options));
    return result.join('\n');
  }

  // OpenAPI 3.1 enums support. We need to check if the schema is an object and has a oneOf property
  if ('oneOf' in schema && schema.type !== 'object' && schema.type) {
    result.push(renderOpenApi31Enum(safeName, schema));
    return result.join('\n');
  }

  if ('allOf' in schema) {
    const types = getRefCompositeTypes(schema);
    const mergedSchema = getMergedCompositeObjects(schema);
    const objectType = getTypeFromSchema(mergedSchema, options, `${schemaContext}.allOf`);
    const objectContents = generateObjectTypeContents(mergedSchema, options, schemaContext);
    const hasAdditionalProperties = !!mergedSchema.additionalProperties;

    // Detect "orphan" required fields: top-level `required` entries that reference
    // properties from $ref types rather than inline properties. For these we generate
    // Required<Pick<...>> to enforce non-optionality in TypeScript.
    const requiredPickType = getRequiredPickType(schema, mergedSchema, types);

    if (hasAdditionalProperties) {
      const compositeTypes = [...types, requiredPickType, objectType].filter(Boolean).join(' & ');
      result.push(`export type ${safeName} = ${compositeTypes};`);
      return `${result.join('\n')}\n`;
    }

    if (useTypeAliases || requiredPickType) {
      // When requiredPickType is present we must use type alias (intersection) style,
      // because `interface extends` does not allow extending two types that declare the
      // same property with different optionality (e.g. `Team` with `id?` and
      // `Required<Pick<Team, 'id'>>` with `id` — TS2320).
      const objectLiteral = objectContents ? `{\n${objectContents}\n}` : '';
      const allTypes = [...types, requiredPickType, objectLiteral].filter(Boolean);
      const compositeTypes = allTypes.join(' & ');
      result.push(`export type ${safeName} = ${compositeTypes};`);
      return `${result.join('\n')}\n`;
    }

    const extensions = types.length ? `extends ${types.join(', ')} ` : '';
    result.push(`export interface ${safeName} ${extensions}{`);
    result.push(objectContents);
  } else if ('oneOf' in schema || 'anyOf' in schema) {
    const typeDefinition = getTypeFromSchema(schema, options, schemaContext);
    result.push(`export type ${safeName} = ${typeDefinition};`);

    return `${result.join('\n')}\n`;
  } else if (schema.type === 'array') {
    // This case is quite rare but is definitely possible that a schema definition is
    // an array of something. In this case it's just a type reference
    result.push(`export type ${safeName} = ${generateItemsType(schema.items, options)}[];`);
    return result.join('\n');
  } else {
    const objectType = getTypeFromSchema(schema, options, schemaContext);
    const hasAdditionalProperties = !!schema.additionalProperties;

    const objectContents = generateObjectTypeContents(schema, options, schemaContext);
    if (hasAdditionalProperties) {
      result.push(`export type ${safeName} = ${objectType};`);
      return `${result.join('\n')}\n`;
    }

    if (useTypeAliases) {
      result.push(`export type ${safeName} = {`);
      result.push(objectContents);
      return `${result.join('\n')}\n};\n`;
    }

    result.push(`export interface ${safeName} {`);
    result.push(objectContents);
  }

  return `${result.join('\n')}\n}\n`;
}

/**
 * Generates the inline contents of an object type.
 */
function generateObjectTypeContents(
  schema: OA3.SchemaObject,
  options: AppOptions,
  schemaContext = 'components.schemas.unknown'
) {
  const result: string[] = [];
  const required = schema.required || [];
  const props = Object.keys(schema.properties || {});

  for (const prop of props) {
    const propDefinition = schema.properties[prop];
    const isRequired = !!~required.indexOf(prop);
    result.push(renderTypeProp(prop, propDefinition, isRequired, options, schemaContext));
  }

  return result.join('\n');
}

function generateItemsType(schema: OA3.ReferenceObject | OA3.SchemaObject, options: AppOptions) {
  const fallbackType = options.preferAny ? 'any' : 'unknown';

  if ('$ref' in schema) {
    const refName = schema.$ref.split('/').pop();
    return getSafeIdentifier(refName) || fallbackType;
  }

  // Schema object is not supported at the moment, but it can be added if needed
  return schema.type ?? fallbackType;
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
    res += `  ${escapePropName(enumNames[index])} = ${enumValues[index]},\n`;
  }
  return `${res}}\n`;
}

/**
 * Render simple enum types (just a union of values)
 */
function renderEnumType(name: string, def: OA3.SchemaObject, options: AppOptions) {
  if (options.enumDeclarationStyle === 'enum' && shouldRenderStringEnumDeclaration(def)) {
    return renderStringEnumDeclaration(name, def, options);
  }

  const values = def.enum.map((v) => (typeof v === 'number' ? v : `"${v}"`)).join(' | ');
  return `export type ${name} = ${values};\n`;
}

function shouldRenderStringEnumDeclaration(def: OA3.SchemaObject): def is OA3.SchemaObject & {
  enum: string[];
} {
  return (
    def.type === 'string' &&
    Array.isArray(def.enum) &&
    def.enum.every((value) => typeof value === 'string')
  );
}

function renderStringEnumDeclaration(
  name: string,
  def: OA3.SchemaObject & { enum: string[] },
  options: AppOptions
) {
  const usePascalCase = options.enumNamesStyle === 'PascalCase';
  let res = `export enum ${name} {\n`;
  for (let index = 0; index < def.enum.length; index++) {
    const value = def.enum[index];
    const rawName = usePascalCase ? toPascalCase(value) : value;
    const memberName = escapePropName(rawName) ?? `VALUE_${index}`;
    res += `  ${memberName} = ${JSON.stringify(value)},\n`;
  }

  return `${res}}\n`;
}

/**
 * Converts a string to PascalCase.
 * Splits on non-alphanumeric characters (spaces, hyphens, dots, underscores, etc.)
 * and capitalizes the first letter of each segment.
 *
 * Examples: "org name" → "OrgName", "my-value" → "MyValue", "some.thing" → "SomeThing"
 */
function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

/**
 * OpenApi 3.1 introduced a new way to define enums that we support here.
 */
function renderOpenApi31Enum(name: string, def: OA31.SchemaObject) {
  let res = `export enum ${name} {\n`;
  for (const v of def.oneOf) {
    if ('const' in v) {
      res += `  ${escapePropName(v.title)} = ${
        typeof v.const === 'string' ? `"${v.const}"` : v.const
      },\n`;
    }
  }

  return `${res}}\n`;
}

function renderTypeProp(
  propName: string,
  definition: OA3.ReferenceObject | OA3.SchemaObject,
  required: boolean,
  options: AppOptions,
  schemaContext: string
): string {
  const lines: string[] = [];
  const type = getTypeFromSchema(definition, options, `${schemaContext}.properties.${propName}`);

  if ('description' in definition || 'title' in definition) {
    const renderedComment = renderComment(definition.description ?? definition.title);
    if (renderedComment) {
      lines.push(indentComment(renderedComment, '  '));
    }
  }

  const isOptional = !required || isNullableAsOptional(definition, options);
  const optionalMark = isOptional ? '?' : '';
  // If prop name is not a valid identifier, we need to wrap it in quotes.
  // We can't use getSafeIdentifier here because it will affect the data model.
  const safePropName = escapePropName(propName);
  lines.push(`  ${safePropName}${optionalMark}: ${type};`);

  return lines.join('\n');
}

function indentComment(comment: string, indent: string): string {
  return comment
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

/**
 * When nullableAsOptional strategy is set, nullable properties are treated as optional.
 * Supports both OA3.0 (nullable: true) and OA3.1 (type: ["string", "null"]).
 * @returns True if the property should be treated as optional, false otherwise.
 */
function isNullableAsOptional(
  definition: OA3.ReferenceObject | OA3.SchemaObject,
  options: AppOptions
) {
  if ('$ref' in definition) {
    return false;
  }

  return (
    options.nullableStrategy === 'nullableAsOptional' &&
    (definition.nullable === true ||
      (Array.isArray(definition.type) && definition.type.includes('null')))
  );
}

/**
 * Detects "orphan" required fields: top-level `required` entries that are not covered
 * by inline `properties` in the merged schema. For these fields, we generate a
 * `Required<Pick<RefType, 'prop1' | 'prop2'>>` expression to enforce non-optionality.
 *
 * @returns A `Required<Pick<...>>` type string, or an empty string if not applicable.
 */
function getRequiredPickType(
  originalSchema: OA3.SchemaObject,
  mergedSchema: OA3.SchemaObject,
  refTypes: string[]
): string {
  const topLevelRequired = originalSchema.required || [];
  if (!topLevelRequired.length || !refTypes.length) return '';

  const inlineProps = Object.keys(mergedSchema.properties || {});
  const orphanRequired = topLevelRequired.filter((r) => !inlineProps.includes(r));
  if (!orphanRequired.length) return '';

  const propsUnion = orphanRequired.map((p) => `'${p}'`).join(' | ');
  const baseType = refTypes.length === 1 ? refTypes[0] : refTypes.join(' & ');

  return `Required<Pick<${baseType}, ${propsUnion}>>`;
}

function getMergedCompositeObjects(schema: OA3.SchemaObject): OA3.SchemaObject {
  const { allOf, oneOf, anyOf, ...safeSchema } = schema;
  const composite = allOf || oneOf || anyOf || [];
  const subSchemas = composite.filter((v) => !('$ref' in v));

  // This is the case where schema itself has properties, required fields,
  // or is of type object — and at the same time has sub-schemas like `allOf` or similar.
  // We include the parent schema data so that `required` and `properties` are not lost.
  if ('properties' in safeSchema || 'required' in safeSchema) {
    subSchemas.push(safeSchema);
  }

  return deepMerge({}, ...subSchemas) as OA3.SchemaObject;
}

function isObject(item?: object): item is Record<string, object> {
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
