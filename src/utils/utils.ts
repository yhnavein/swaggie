import type { OpenAPIV3 as OA3 } from 'openapi-types';

const reservedWords = [
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
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
];

export function escapeReservedWords(name?: string | null): string {
  let escapedName = name;

  if (reservedWords.indexOf(name) >= 0) {
    escapedName = `_${name}`;
  }
  return escapedName;
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
