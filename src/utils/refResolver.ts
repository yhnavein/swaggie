import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

type ComponentSection = 'schemas' | 'parameters' | 'requestBodies' | 'responses';

const SUPPORTED_COMPONENT_SECTIONS = new Set<ComponentSection>([
  'schemas',
  'parameters',
  'requestBodies',
  'responses',
]);

interface RefContext {
  rootSpec: OA3.Document;
  rootSpecPath: string;
  docCache: Map<string, any>;
  importedRefs: Map<string, string>;
  resolvingRefs: Set<string>;
}

type ResolvedRef = { type: 'ref'; value: string } | { type: 'inline'; value: unknown };

/**
 * Resolves external file refs into local component refs.
 * For now we only support local file refs (no http/https) and component targets.
 */
export async function resolveExternalFileRefs(
  spec: OA3.Document,
  rootSpecPath: string
): Promise<OA3.Document> {
  const resolvedRootPath = path.resolve(rootSpecPath);
  const context: RefContext = {
    rootSpec: spec,
    rootSpecPath: resolvedRootPath,
    docCache: new Map(),
    importedRefs: new Map(),
    resolvingRefs: new Set(),
  };

  await rewriteRefsInNode(spec, resolvedRootPath, context);

  return spec;
}

async function rewriteRefsInNode(node: unknown, currentFilePath: string, context: RefContext) {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      await rewriteRefsInNode(item, currentFilePath, context);
    }
    return;
  }

  if (typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;

  if (typeof record.$ref === 'string') {
    const resolved = await resolveRef(record.$ref, currentFilePath, context);
    if (resolved.type === 'ref') {
      record.$ref = resolved.value;
    } else if (Object.keys(record).length === 1) {
      for (const key of Object.keys(record)) {
        delete record[key];
      }
      Object.assign(record, resolved.value as object);
    }
  }

  const values = Object.values(record);
  for (const value of values) {
    await rewriteRefsInNode(value, currentFilePath, context);
  }
}

async function resolveRef(
  rawRef: string,
  currentFilePath: string,
  context: RefContext
): Promise<ResolvedRef> {
  if (rawRef.startsWith('#/')) {
    if (path.resolve(currentFilePath) === context.rootSpecPath) {
      return { type: 'ref', value: rawRef };
    }

    return importRefFromFile(path.resolve(currentFilePath), rawRef, rawRef, context);
  }

  if (/^https?:\/\//i.test(rawRef)) {
    throw new Error(`External HTTP refs are not supported: '${rawRef}'`);
  }

  const [rawFilePath, fragment] = rawRef.split('#');
  if (!rawFilePath) {
    throw new Error(`Unsupported $ref format: '${rawRef}'`);
  }

  if (!fragment) {
    throw new Error(`External refs must include a JSON pointer fragment: '${rawRef}'`);
  }

  if (!fragment.startsWith('/')) {
    throw new Error(`Unsupported $ref pointer format: '${rawRef}'`);
  }

  const resolvedPath = path.resolve(path.dirname(currentFilePath), rawFilePath);
  const pointer = `#${fragment}`;

  return importRefFromFile(resolvedPath, pointer, rawRef, context);
}

async function importRefFromFile(
  sourceFilePath: string,
  pointer: string,
  rawRef: string,
  context: RefContext
): Promise<ResolvedRef> {
  const targetInfo = parseImportTarget(pointer);
  const target = await getValueByPointer(sourceFilePath, pointer, context);
  const importKey = `${sourceFilePath}${pointer}`;

  if (!targetInfo) {
    if (context.resolvingRefs.has(importKey)) {
      throw new Error(`Circular non-component external ref is not supported: '${rawRef}'`);
    }

    const targetCopy = structuredClone(target);
    context.resolvingRefs.add(importKey);
    await rewriteRefsInNode(targetCopy, sourceFilePath, context);
    context.resolvingRefs.delete(importKey);

    return { type: 'inline', value: targetCopy };
  }
  const existingRef = context.importedRefs.get(importKey);
  if (existingRef) {
    return { type: 'ref', value: existingRef };
  }

  const section = targetInfo.section;
  const name = targetInfo.name;
  const targetCopy = structuredClone(target);
  const alias = getOrCreateComponentAlias(section, name, sourceFilePath, context);
  const localRef = `#/components/${section}/${alias}`;

  context.importedRefs.set(importKey, localRef);

  const sectionMap = ensureComponentSection(context.rootSpec, section);
  sectionMap[alias] = targetCopy;

  context.resolvingRefs.add(importKey);
  await rewriteRefsInNode(targetCopy, sourceFilePath, context);
  context.resolvingRefs.delete(importKey);

  return { type: 'ref', value: localRef };
}

function parseImportTarget(pointer: string): { section: ComponentSection; name: string } | null {
  const parts = pointer.replace(/^#\//, '').split('/').map(unescapePointerSegment);

  if (parts.length === 2) {
    const [legacySection, name] = parts;
    if (legacySection === 'parameters') {
      return { section: 'parameters', name };
    }
    if (legacySection === 'responses') {
      return { section: 'responses', name };
    }
    if (legacySection === 'requestBodies') {
      return { section: 'requestBodies', name };
    }
    if (legacySection === 'definitions') {
      return { section: 'schemas', name };
    }
  }

  if (parts.length !== 3 || parts[0] !== 'components') {
    return null;
  }

  const section = parts[1] as ComponentSection;
  const name = parts[2];

  if (!SUPPORTED_COMPONENT_SECTIONS.has(section)) {
    return null;
  }

  if (!name) {
    return null;
  }

  return { section, name };
}

function ensureComponentSection(
  spec: OA3.Document,
  section: ComponentSection
): Record<string, any> {
  if (!spec.components) {
    spec.components = {};
  }

  if (!spec.components[section]) {
    spec.components[section] = {};
  }

  return spec.components[section] as Record<string, any>;
}

function getOrCreateComponentAlias(
  section: ComponentSection,
  originalName: string,
  sourceFilePath: string,
  context: RefContext
): string {
  const sectionMap = ensureComponentSection(context.rootSpec, section);

  if (!sectionMap[originalName]) {
    return originalName;
  }

  const suffix = shortHash(sourceFilePath);
  let candidate = `${originalName}__${suffix}`;
  let inc = 2;

  while (sectionMap[candidate]) {
    candidate = `${originalName}__${suffix}_${inc}`;
    inc += 1;
  }

  return candidate;
}

async function getValueByPointer(
  filePath: string,
  pointer: string,
  context: RefContext
): Promise<any> {
  const doc = await loadDocument(filePath, context);
  const parts = pointer.replace(/^#\//, '').split('/').map(unescapePointerSegment);

  let current: any = doc;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      throw new Error(`Could not resolve ref pointer '${pointer}' in '${filePath}'`);
    }

    current = current[part];
  }

  return current;
}

async function loadDocument(filePath: string, context: RefContext): Promise<any> {
  const absPath = path.resolve(filePath);
  const cached = context.docCache.get(absPath);
  if (cached) {
    return cached;
  }

  const contents = await fs.readFile(absPath, 'utf8');
  const parsed = parseFileContents(contents, absPath);
  context.docCache.set(absPath, parsed);
  return parsed;
}

function parseFileContents(contents: string, filePath: string): any {
  if (/.ya?ml$/i.test(filePath)) {
    return parseYaml(contents);
  }

  if (/.json$/i.test(filePath)) {
    return JSON.parse(contents);
  }

  const firstChar = contents.trimStart()[0];
  return firstChar === '{' ? JSON.parse(contents) : parseYaml(contents);
}

function unescapePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function shortHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }

  return hash.toString(36);
}
