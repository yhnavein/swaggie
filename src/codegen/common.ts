import ts from 'typescript';
import { camelCase, get } from 'lodash';
import { OpenAPIV3 as OA3 } from 'openapi-types';

const _questionToken = ts.createToken(ts.SyntaxKind.QuestionToken);

export function questionToken(condition?: boolean | null) {
  return condition ? _questionToken : undefined;
}

export const modifiers = {
  export: ts.createModifier(ts.SyntaxKind.ExportKeyword),
};
export const keywordType = {
  any: ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
  number: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
  object: ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword),
  string: ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  boolean: ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
  undefined: ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
  null: ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword as any),
  void: ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
};

export function isNullable(schema: any) {
  return !!(schema && schema.nullable);
}

export function isReference(obj: any): obj is OA3.ReferenceObject {
  return obj && '$ref' in obj;
}

export function getReference(spec: any, ref: string) {
  const path = ref
    .slice(2)
    .split('/')
    .map((s) => unescape(s.replace(/~1/g, '/').replace(/~0/g, '~')));

  const ret = get(spec, path);
  if (typeof ret === 'undefined') {
    throw new Error(`Can't find ${path}`);
  }
  return ret;
}

/**
 * If the given object is a ReferenceObject, return the last part of its path.
 */
export function getReferenceName(obj: any) {
  if (isReference(obj)) {
    return camelCase(obj.$ref.split('/').slice(-1)[0]);
  }
}
