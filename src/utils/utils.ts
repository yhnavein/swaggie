import { mkdir, writeFileSync as fsWriteFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import type { ApiOperation } from '../types';

const reservedKeywords = new Set([
  'arguments',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'volatile',
  'while',
  'with',
  'yield',

  // Some of the variables that are used internally in the generated code. We can't allow
  // user to use them as parameter names.
  '$config',
  'axios',
  'cacheUrl',
  'config',
  'data',
  'error',
  'http',
  'key',
  'mutate',
  'url',
  'xior',
]);

/**
 * Escapes reserved words so they can be used as a valid identifier in the generated code.
 * For example, `break` is a reserved word in TypeScript, but it is allowed in OpenAPI.
 * Escaping is done by adding an underscore prefix.
 */
export function escapeIdentifier(name?: string | null): string {
  if (!name) {
    return name;
  }

  if (reservedKeywords.has(name) || /^[0-9]/.test(name)) {
    return `_${name}`;
  }

  return name;
}

/**
 * Escapes property name so it can be used as a valid identifier in the generated code.
 * It does not change the model, as it wraps it in quotes. It's only used for property names.
 * Property names need quotes if they:
 * - Contain special characters (not letters, numbers, underscore, or dollar sign)
 * - Start with a number
 */
export function escapePropName(propName?: string | null): string | null {
  if (!propName) {
    return null;
  }

  if (
    // Check if it starts with a number
    /^[0-9]/.test(propName) ||
    // Check if it contains any character that's not a letter, number, underscore, or dollar sign
    // This covers spaces, hyphens, dots, and all other special characters
    !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName)
  ) {
    return `"${propName}"`;
  }

  return propName;
}

/** Validates if the spec document is correct and if is supported */
export function verifyDocumentSpec(spec: VerifableDocument): OA3.Document {
  if (!spec) {
    throw new Error('Document is empty!');
  }
  if (spec.swagger || !spec.openapi) {
    throw new Error(
      "Swagger is not supported anymore. Use swagger2openapi (if you can't change the spec to OpenAPI)."
    );
  }

  return spec;
}

export interface VerifableDocument extends OA3.Document {
  swagger?: string;
  openapi: string;
}

export function saveFile(filePath: string, contents: string) {
  return new Promise((resolve, reject) => {
    mkdir(dirname(filePath), { recursive: true }, (err) => {
      if (err) {
        reject(err);
      }

      fsWriteFileSync(filePath, contents);
      resolve(true);
    });
  });
}

/**
 * Operations list contains tags, which can be used to group them.
 * The grouping allows us to generate multiple client classes dedicated
 * to a specific group of operations.
 */
export function groupOperationsByGroupName(operations: ApiOperation[]) {
  if (!operations) {
    return {};
  }

  return operations.reduce<{ [key: string]: ApiOperation[] }>((groups, op) => {
    if (!groups[op.group]) {
      groups[op.group] = [];
    }
    groups[op.group].push(op);
    return groups;
  }, {});
}

/**
 * Operations in OpenAPI can have multiple responses, but
 * we are interested in the one that is the most common for
 * a standard success response. And we need the content of it.
 * Content is per media type and we need to choose only one.
 * We will try to get the first one that is JSON or plain text.
 * Other media types are not supported at this time.
 * @returns Response or reference of the success response
 */
export function getBestResponse(op: OA3.OperationObject): [OA3.MediaTypeObject, MyContentType] {
  const NOT_FOUND = 100000;
  const lowestCode = Object.keys(op.responses).sort().shift() ?? NOT_FOUND;

  const resp = lowestCode === NOT_FOUND ? op.responses[0] : op.responses[lowestCode.toString()];

  if (resp && 'content' in resp) {
    return getBestContentType(resp);
  }
  return [null, null];
}

/** This method tries to fix potentially wrong out parameter given from commandline */
export function prepareOutputFilename(out: string | null): string {
  if (!out) {
    return null;
  }

  if (/\.[jt]sx?$/i.test(out)) {
    return out.replace(/[\\]/i, '/');
  }
  if (/[\/\\]$/i.test(out)) {
    return `${out.replace(/[\/\\]$/i, '')}/index.ts`;
  }
  return `${out.replace(/[\\]/i, '/')}.ts`;
}

export function orderBy<T>(arr: T[] | null | undefined, key: string) {
  if (!arr) {
    return [];
  }

  return arr.concat().sort(sortByKey(key));
}

const sortByKey = (key: string) => (a, b) => a[key] > b[key] ? 1 : b[key] > a[key] ? -1 : 0;

const orderedContentTypes = [
  'application/json',
  'text/json',
  'text/plain',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
];
export function getBestContentType(
  reqBody: OA3.RequestBodyObject | OA3.ResponseObject
): [OA3.MediaTypeObject, MyContentType] {
  const contentTypes = Object.keys(reqBody.content);
  if (contentTypes.length === 0) {
    return [null, null];
  }

  const firstContentType = orderedContentTypes.find((ct) => contentTypes.includes(ct));
  if (firstContentType) {
    const typeObject = reqBody.content[firstContentType];
    const type = getContentType(firstContentType);
    return [typeObject, type];
  }

  const typeObject = reqBody.content[contentTypes[0]];
  const type = getContentType(contentTypes[0]);
  return [typeObject, type];
}

function getContentType(type: string) {
  if (type === 'application/x-www-form-urlencoded') {
    return 'urlencoded';
  }
  if (type === 'multipart/form-data') {
    return 'form-data';
  }
  if (type === 'application/octet-stream') {
    return 'binary';
  }
  if (type === 'text/plain') {
    return 'text';
  }
  return 'json';
}

export type MyContentType = 'json' | 'urlencoded' | 'form-data' | 'binary' | 'text';
