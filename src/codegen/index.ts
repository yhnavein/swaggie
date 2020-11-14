import ts from 'typescript';
import { OpenAPIV3 as OA3 } from 'openapi-types';
import _ from 'lodash';

import {
  modifiers,
  questionToken,
  isNullable,
  keywordType,
  isReference,
  getReference,
} from './common';

export default function generateApi(spec: OA3.Document) {
  const aliases: ts.TypeAliasDeclaration[] = [];

  function resolve<T>(obj: T | OA3.ReferenceObject) {
    if (!isReference(obj)) return obj;
    const ref = obj.$ref;
    if (!ref.startsWith('#/')) {
      throw new Error(
        `External refs are not supported (${ref}). Make sure to call SwaggerParser.bundle() first.`
      );
    }
    return getReference(spec, ref) as T;
  }

  function resolveArray<T>(array?: (T | OA3.ReferenceObject)[]) {
    return array ? array.map(resolve) : [];
  }
}
