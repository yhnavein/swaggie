import type { OpenAPIV3 as OA3 } from 'openapi-types';

import type { ClientOptions } from '../types';

/**
 * Finds all of the used refs in the spec using Mark-and-Sweep algorithm.
 * This properly handles transitive dependencies where unused schemas reference other schemas.
 * @param spec - The OpenAPI spec document
 * @param options - The options for the generation
 * @param refs - The set of used refs. It will be modified in place.
 */
export function findAllUsedRefs(spec: OA3.Document, options: ClientOptions, refs: Set<string>) {
  // Phase 1: Mark - Find all direct references from non-schema parts of the spec
  const directRefs = new Set<string>();

  // Traverse paths, parameters, responses, etc. (everything except components.schemas)
  const specWithoutSchemas = { ...spec };
  if (specWithoutSchemas.components) {
    specWithoutSchemas.components = { ...specWithoutSchemas.components };
    delete specWithoutSchemas.components.schemas;
  }

  findDirectRefs(specWithoutSchemas, options, directRefs);

  // Phase 2: Sweep - Recursively find all schemas referenced by the marked schemas
  const allSchemas = spec.components?.schemas || {};
  const visited = new Set<string>();

  // Start with directly referenced schemas and follow their dependencies
  for (const refName of directRefs) {
    if (allSchemas[refName]) {
      markSchemaAsUsed(refName, allSchemas, visited, refs, options);
    }
  }
}

/**
 * Finds direct references from non-schema parts of the OpenAPI spec.
 */
function findDirectRefs(obj: any, options: ClientOptions, refs: Set<string>) {
  if (!obj) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      findDirectRefs(item, options, refs);
    }
    return;
  }

  if (typeof obj !== 'object') {
    return;
  }

  // If the object is deprecated and we want to skip deprecated objects,
  // we won't process it and anything below it
  if (options.skipDeprecated && obj.deprecated) {
    return;
  }

  if (
    '$ref' in obj &&
    typeof obj.$ref === 'string' &&
    obj.$ref.startsWith('#/components/schemas/')
  ) {
    const refName = obj.$ref.split('/').pop();
    if (refName) {
      refs.add(refName);
    }
  }

  // Recursively traverse all object properties
  Object.values(obj).forEach((value) => findDirectRefs(value, options, refs));
}

/**
 * Recursively marks a schema and all its dependencies as used.
 */
function markSchemaAsUsed(
  schemaName: string,
  allSchemas: Record<string, OA3.ReferenceObject | OA3.SchemaObject>,
  visited: Set<string>,
  usedRefs: Set<string>,
  options: ClientOptions
) {
  // Avoid infinite recursion for circular dependencies
  if (visited.has(schemaName)) {
    return;
  }

  visited.add(schemaName);
  usedRefs.add(schemaName);

  const schema = allSchemas[schemaName];
  if (!schema) {
    return;
  }

  // If this schema is deprecated and we're skipping deprecated schemas,
  // don't traverse its dependencies
  if (options.skipDeprecated && 'deprecated' in schema && schema.deprecated) {
    return;
  }

  // Find all schema references within this schema
  const referencedSchemas = new Set<string>();
  findSchemaRefs(schema, referencedSchemas);

  // Recursively mark all referenced schemas as used
  for (const refName of referencedSchemas) {
    if (allSchemas[refName]) {
      markSchemaAsUsed(refName, allSchemas, visited, usedRefs, options);
    }
  }
}

/**
 * Finds all schema references within a schema definition.
 */
function findSchemaRefs(obj: any, refs: Set<string>) {
  if (!obj) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      findSchemaRefs(item, refs);
    }
    return;
  }

  if (typeof obj !== 'object') {
    return;
  }

  if (
    '$ref' in obj &&
    typeof obj.$ref === 'string' &&
    obj.$ref.startsWith('#/components/schemas/')
  ) {
    const refName = obj.$ref.split('/').pop();
    if (refName) {
      refs.add(refName);
    }
  }

  // Recursively traverse all object properties
  Object.values(obj).forEach((value) => findSchemaRefs(value, refs));
}
