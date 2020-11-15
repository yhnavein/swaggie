import ts from 'typescript';
import { OpenAPIV3 as OA3 } from 'openapi-types';
import _ from 'lodash';

import { modifiers, questionToken, isNullable, keywordType, isReference } from './common';

/*
export function genType(name: string, props: any[]): ts.InterfaceDeclaration {
  const fields = props.map((p) =>
    ts.createPropertySignature(
      undefined,
      ts.createIdentifier(p.name),
      questionToken(p.nullable),
      ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
      undefined
    )
  );
  return ts.createInterfaceDeclaration(
    undefined,
    [modifiers.export],
    ts.createIdentifier(name),
    undefined,
    undefined,
    [
      ts.createPropertySignature(
        undefined,
        ts.createIdentifier('id'),
        undefined,
        ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        undefined
      ),
      ts.createPropertySignature(
        undefined,
        ts.createIdentifier('marketCode'),
        questionToken(true),
        ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        undefined
      ),
      ts.createPropertySignature(
        undefined,
        ts.createIdentifier('entries'),
        undefined,
        ts.createArrayTypeNode(
          ts.createTypeReferenceNode(ts.createIdentifier('BookEntry'), undefined)
        ),
        undefined
      ),
    ]
  );
}
*/

const aliases: ts.TypeAliasDeclaration[] = [];
const refs: Record<string, ts.TypeReferenceNode> = {};

function getRefAlias(obj: OA3.ReferenceObject) {
  const { $ref } = obj;
  let ref = refs[$ref];
  if (!ref) {
    const schema = resolve<OA3.SchemaObject>(obj);
    const name = getUniqueAlias(_.upperFirst(schema.title || getRefBasename($ref)));

    ref = refs[$ref] = ts.createTypeReferenceNode(name, undefined);

    const type = getTypeFromSchema(schema);
    aliases.push(
      ts.createTypeAliasDeclaration(undefined, [modifiers.export], name, undefined, type)
    );
  }
  return ref;
}

function getTypeFromSchema(schema?: OA3.SchemaObject | OA3.ReferenceObject): ts.TypeNode {
  const type = getBaseTypeFromSchema(schema);
  return isNullable(schema) ? ts.createUnionTypeNode([type, keywordType.null]) : type;
}

function getRefBasename(ref: string): string {
  return ref.replace(/.+\//, '');
}

export function getBaseTypeFromSchema(
  schema?: OA3.SchemaObject | OA3.ReferenceObject
): ts.TypeNode {
  if (!schema) return keywordType.any;
  if (isReference(schema)) {
    return getRefAlias(schema);
  }

  if (schema.oneOf) {
    // oneOf -> union
    return getUnionType(schema.oneOf, schema.discriminator);
  }
  if (schema.anyOf) {
    // anyOf -> union
    return ts.createUnionTypeNode(schema.anyOf.map(getTypeFromSchema));
  }
  if (schema.allOf) {
    // allOf -> intersection
    return ts.createIntersectionTypeNode(schema.allOf.map(getTypeFromSchema));
  }
  if ('items' in schema) {
    // items -> array
    return ts.createArrayTypeNode(getTypeFromSchema(schema.items));
  }
  if (schema.properties || schema.additionalProperties) {
    // properties -> literal type
    return getTypeFromProperties(
      schema.properties || {},
      schema.required,
      schema.additionalProperties
    );
  }
  if (schema.enum) {
    // enum -> union of literal types
    const types = schema.enum.map((s) =>
      s === null ? keywordType.null : ts.createLiteralTypeNode(ts.createStringLiteral(s))
    );
    return types.length > 1 ? ts.createUnionTypeNode(types) : types[0];
  }
  if (schema.format === 'binary') {
    return ts.createTypeReferenceNode('Blob', []);
  }
  if (schema.type) {
    // string, boolean, null, number
    if (schema.type in keywordType) return keywordType[schema.type];
    if (schema.type === 'integer') return keywordType.number;
  }

  return keywordType.any;
}

function supportDeepObjects(params: OA3.ParameterObject[]) {
  const res: OA3.ParameterObject[] = [];
  const merged: any = {};
  params.forEach((p) => {
    const m = /^(.+?)\[(.*?)\]/.exec(p.name);
    if (!m) {
      res.push(p);
      return;
    }
    const [, name, prop] = m;
    let obj = merged[name];
    if (!obj) {
      obj = merged[name] = {
        name,
        in: p.in,
        style: 'deepObject',
        schema: {
          type: 'object',
          properties: {},
        },
      };
      res.push(obj);
    }
    obj.schema.properties[prop] = p.schema;
  });
  return res;
}

const typeAliases: Record<string, number> = {};
function getUniqueAlias(name: string) {
  let used = typeAliases[name] || 0;
  if (used) {
    typeAliases[name] = ++used;
    name += used;
  }
  typeAliases[name] = 1;
  return name;
}
function getTypeFromProperties(
  props: {
    [prop: string]: OA3.SchemaObject | OA3.ReferenceObject;
  },
  required?: string[],
  additionalProperties?: boolean | OA3.SchemaObject | OA3.ReferenceObject
) {
  const members: ts.TypeElement[] = Object.keys(props).map((name) => {
    const schema = props[name];
    const isRequired = required && required.includes(name);
    return ts.createPropertySignature(
      undefined,
      name,
      questionToken(!isRequired),
      getTypeFromSchema(schema)
    );
  });
  if (additionalProperties) {
    const type =
      additionalProperties === true ? keywordType.any : getTypeFromSchema(additionalProperties);

    members.push(ts.createIndexSignature(undefined, undefined, undefined, type));
  }
  return ts.createTypeLiteralNode(members);
}

export function getUnionType(
  variants: (OA3.ReferenceObject | OA3.SchemaObject)[],
  discriminator?: OA3.DiscriminatorObject
): ts.TypeNode {
  if (discriminator) {
    // oneOf + discriminator -> tagged union (polymorphism)
    if (discriminator.propertyName === undefined) {
      throw new Error('Discriminators require a propertyName');
    }

    // By default, the last component of the ref name (i.e., after the last trailing slash) is
    // used as the discriminator value for each variant. This can be overridden using the
    // discriminator.mapping property.
    const mappedValues = new Set(
      Object.values(discriminator.mapping || {}).map((ref) => getRefBasename(ref))
    );

    return ts.createUnionTypeNode(
      ([
        ...Object.entries(discriminator.mapping || {}).map(([discriminatorValue, variantRef]) => [
          discriminatorValue,
          { $ref: variantRef },
        ]),
        ...variants
          .filter((variant) => {
            if (!isReference(variant)) {
              // From the Swagger spec: "When using the discriminator, inline schemas will not be
              // considered."
              throw new Error('Discriminators require references, not inline schemas');
            }
            return !mappedValues.has(getRefBasename(variant.$ref));
          })
          .map((schema) => [getRefBasename((schema as OA3.ReferenceObject).$ref), schema]),
      ] as [string, OA3.ReferenceObject][]).map(([discriminatorValue, variant]) =>
        // Yields: { [discriminator.propertyName]: discriminatorValue } & variant
        ts.createIntersectionTypeNode([
          ts.createTypeLiteralNode([
            ts.createPropertySignature(
              undefined,
              discriminator.propertyName,
              undefined,
              ts.createLiteralTypeNode(ts.createStringLiteral(discriminatorValue))
            ),
          ]),
          getTypeFromSchema(variant),
        ])
      )
    );
  } else {
    // oneOf -> untagged union
    return ts.createUnionTypeNode(variants.map(getTypeFromSchema));
  }
}

function resolve<T>(obj: T | OA3.ReferenceObject) {
  if (!isReference(obj)) return obj;
  const ref = obj.$ref;
  if (!ref.startsWith('#/')) {
    throw new Error(
      `External refs are not supported (${ref}). Make sure to call SwaggerParser.bundle() first.`
    );
  }
  // return getReference(spec, ref) as T;
}

function resolveArray<T>(array?: (T | OA3.ReferenceObject)[]) {
  return array ? array.map(resolve) : [];
}
