import { test, describe } from 'node:test';
import assert from 'node:assert';
import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';

import generateTypes, { renderComment } from './genTypes';
import {
  assertEqualIgnoringWhitespace,
  getClientOptions,
  getDocument,
} from '../../test/test.utils';

describe('generateTypes', () => {
  const opts = getClientOptions();

  test('should handle empty components properly', () => {
    const res = generateTypes(getDocument({ components: {} }), opts);

    assert.strictEqual(res, '');
  });

  test('should handle empty components schemas properly', () => {
    const res = generateTypes(getDocument({ components: { schemas: {} } }), opts);

    assert.strictEqual(res, '');
  });

  test('should handle schema with reference only', () => {
    const res = generateTypes(
      prepareSchemas({
        A: {
          $ref: '#/components/schemas/B',
        },
        B: {
          type: 'string',
        },
      }),
      opts
    );

    assertEqualIgnoringWhitespace(
      res,
      `
export type A = B;
export interface B {}`
    );
  });

  describe('enums', () => {
    test('should handle simple enums correctly', () => {
      const res = generateTypes(
        prepareSchemas({
          SimpleEnum: {
            type: 'integer',
            format: 'int32',
            enum: [0, 1],
          },
          StringEnum: {
            type: 'string',
            description: 'Feature is activated or not',
            enum: ['Active', 'Disabled'],
          },
        }),
        opts
      );

      assertEqualIgnoringWhitespace(
        res,
        `
export type SimpleEnum = 0 | 1;

/** Feature is activated or not */
export type StringEnum = "Active" | "Disabled";`
      );
    });

    test('should handle extended enums correctly', () => {
      const res = generateTypes(
        prepareSchemas({
          XEnums: {
            type: 'integer',
            format: 'int32',
            enum: [2, 1, 0],
            'x-enumNames': ['High', 'Medium', 'Low'],
          },
          XEnumVarnames: {
            type: 'integer',
            format: 'int32',
            enum: [2, 1, 0],
            'x-enum-varnames': ['High', 'Medium', 'Low'],
          },
          XEnumsString: {
            type: 'string',
            enum: ['L', 'M', 'S'],
            description: 'How big the feature is',
            'x-enumNames': ['Large', 'Medium', 'Small'],
          },
        }),
        opts
      );

      assertEqualIgnoringWhitespace(
        res,
        `
export enum XEnums {
  High = 2,
  Medium = 1,
  Low = 0,
}

export enum XEnumVarnames {
  High = 2,
  Medium = 1,
  Low = 0,
}

/** How big the feature is */
export enum XEnumsString {
  Large = "L",
  Medium = "M",
  Small = "S",
}`
      );
    });

    test('should handle OpenApi 3.1 enums', () => {
      const res = generateTypes(
        prepareSchemas({
          Priority: {
            type: 'integer',
            format: 'int32',
            oneOf: [
              { title: 'High', const: 2, description: 'High priority' },
              { title: 'Medium', const: 1, description: 'Medium priority' },
              { title: 'Low', const: 0, description: 'Low priority' },
            ],
          },
          Size: {
            type: 'string',
            description: 'How big the feature is',
            oneOf: [
              { title: 'Large', const: 'L', description: 'Large size' },
              { title: 'Medium', const: 'M', description: 'Medium size' },
              { title: 'Small', const: 'S', description: 'Small size' },
            ],
          },
        }),
        opts
      );

      assertEqualIgnoringWhitespace(
        res,
        `
export enum Priority {
  High = 2,
  Medium = 1,
  Low = 0,
}

/** How big the feature is */
export enum Size {
  Large = "L",
  Medium = "M",
  Small = "S",
}`
      );
    });

    //     it("should handle NSwag's enum correctly", () => {
    //       const res = generateTypes(
    //         getDocument(),
    //         {
    //           SomeEnum: {
    //             type: 'integer',
    //             format: 'int32',
    //             enum: ['Active', 'Disabled'],
    //             fullEnum: {
    //               Active: 0,
    //               Disabled: 1,
    //             },
    //           },
    //         },
    //         {} as any
    //       );

    //       expect(res).to.be.equal(`export enum SomeEnum {
    //   Active = 0,
    //   Disabled = 1,
    // }`);
    //     });
  });

  describe('objects', () => {
    test('should handle obj with no required fields', () => {
      const res = generateTypes(
        prepareSchemas({
          AuthenticationData: {
            type: 'object',
            properties: {
              login: {
                type: 'string',
              },
              password: {
                type: 'string',
              },
            },
          },
          Empty: {
            type: 'object',
          },
        }),
        opts
      );

      assertEqualIgnoringWhitespace(
        res,
        `
export interface AuthenticationData {
  login?: string;
  password?: string;
}

export interface Empty {}
`
      );
    });

    test('should handle obj with required fields', () => {
      const res = generateTypes(
        prepareSchemas({
          AuthenticationData: {
            type: 'object',
            required: ['login', 'password'],
            properties: {
              login: {
                // ReadOnly or WriteOnly are not yet supported
                // As we don't have a way to distinguish how dev will use
                // generated types in his app
                readOnly: true,
                type: 'string',
              },
              password: {
                writeOnly: true,
                type: 'string',
              },
              rememberMe: {
                type: 'boolean',
              },
            },
          },
        }),
        opts
      );

      assertEqualIgnoringWhitespace(
        res,
        `
export interface AuthenticationData {
  login: string;
  password: string;
  rememberMe?: boolean;
}`
      );
    });
  });

  describe('arrays', () => {
    test('should handle simple array cases', () => {
      const res = generateTypes(
        prepareSchemas({
          StringArray: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          EmptyArray: {
            type: 'array',
            items: {},
          },
          ObjectArray: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/UserViewModel',
            },
          },
        }),
        opts
      );

      assertEqualIgnoringWhitespace(
        res,
        `
export type StringArray = string[];
export type EmptyArray = unknown[];
export type ObjectArray = UserViewModel[];
`
      );
    });

    test('should handle different array types as properties', () => {
      const res = generateTypes(
        prepareSchemas({
          ComplexObject: {
            type: 'object',
            required: ['roles', 'ids'],
            properties: {
              roles: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              ids: {
                type: 'array',
                items: {
                  format: 'int32',
                  type: 'number',
                },
              },
              inlineGroups: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id'],
                  properties: {
                    name: {
                      type: 'string',
                    },
                    id: {
                      format: 'int32',
                      type: 'number',
                    },
                  },
                },
              },
              groups: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Group',
                },
              },
            },
          },
        }),
        opts
      );

      assertEqualIgnoringWhitespace(
        res,
        `
export interface ComplexObject {
  roles: string[];
  ids: number[];
  inlineGroups?: { name?: string; id: number; }[];
  groups?: Group[];
}`
      );
    });
  });

  describe('inheritance', () => {
    describe('allOf', () => {
      test('should handle 2 allOf correctly (most common case)', () => {
        const res = generateTypes(
          prepareSchemas({
            AuthenticationData: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    rememberMe: {
                      type: 'boolean',
                    },
                  },
                },
                { $ref: '#/components/schemas/BasicAuth' },
              ],
            },
          }),
          opts
        );

        assertEqualIgnoringWhitespace(
          res,
          `
export interface AuthenticationData extends BasicAuth {
  rememberMe?: boolean;
}`
        );
      });

      test('should handle many allOf correctly', () => {
        const res = generateTypes(
          prepareSchemas({
            AuthenticationData: {
              allOf: [
                { $ref: '#/components/schemas/LoginPart' },
                { $ref: '#/components/schemas/PasswordPart' },
                {
                  type: 'object',
                  required: ['rememberMe'],
                  properties: {
                    rememberMe: {
                      type: 'boolean',
                    },
                  },
                },
                {
                  type: 'object',
                  properties: {
                    signForSpam: {
                      type: 'boolean',
                    },
                  },
                },
              ],
            },
          }),
          opts
        );

        assertEqualIgnoringWhitespace(
          res,
          `
export interface AuthenticationData extends LoginPart, PasswordPart {
  rememberMe: boolean;
  signForSpam?: boolean;
}`
        );
      });

      test('should handle allOf combined with object directly', () => {
        const res = generateTypes(
          prepareSchemas({
            AuthenticationData: {
              required: ['rememberMe'],
              type: 'object',
              allOf: [{ $ref: '#/components/schemas/LoginPart' }],

              properties: {
                rememberMe: {
                  type: 'boolean',
                },
                signForSpam: {
                  type: 'boolean',
                },
              },
            },
          }),
          opts
        );

        assertEqualIgnoringWhitespace(
          res,
          `
export interface AuthenticationData extends LoginPart {
  rememberMe: boolean;
  signForSpam?: boolean;
}`
        );
      });
    });

    // Use of `anyOf` and `oneOf` is implemented in the same and very simple way
    // We just list all the types in the union. This is close enough to the truth
    // and should be convenient for the end user of Swaggie.

    for (const type of ['anyOf', 'oneOf']) {
      describe(type, () => {
        test(`should handle 1 ${type} with reference correctly`, () => {
          const res = generateTypes(
            prepareSchemas({
              AuthenticationData: {
                [type]: [{ $ref: '#/components/schemas/BasicAuth' }],
              },
            }),
            opts
          );

          assertEqualIgnoringWhitespace(res, 'export type AuthenticationData = BasicAuth;');
        });

        test(`should handle 2 of ${type} with reference correctly`, () => {
          const res = generateTypes(
            prepareSchemas({
              AuthenticationData: {
                [type]: [
                  { $ref: '#/components/schemas/BasicAuth' },
                  { $ref: '#/components/schemas/OAuth2' },
                ],
              },
            }),
            opts
          );

          assertEqualIgnoringWhitespace(
            res,
            'export type AuthenticationData = BasicAuth | OAuth2;'
          );
        });

        test(`should handle ${type} with reference and schema correctly`, () => {
          const res = generateTypes(
            prepareSchemas({
              AuthenticationData: {
                [type]: [
                  { $ref: '#/components/schemas/BasicAuth' },
                  {
                    type: 'object',
                    properties: {
                      token: {
                        type: 'string',
                      },
                    },
                  },
                ],
              },
            }),
            opts
          );

          assertEqualIgnoringWhitespace(
            res,
            'export type AuthenticationData = BasicAuth | { token?: string; };'
          );
        });
      });
    }
  });
});

describe('renderComment', () => {
  test('should render proper multiline comment with trimming', () => {
    const comment = `   Quite a lenghty comment
   With at least two lines    `;
    const res = renderComment(comment);

    assert.strictEqual(
      res,
      ` /**
  * Quite a lenghty comment
  * With at least two lines
  */`
    );
  });

  const testCases = [
    {
      comment: 'One liner',
      expected: '/** One liner */',
    },
    {
      comment: '   One liner   ',
      expected: '/** One liner */',
    },
    {
      comment: null,
      expected: null,
    },
    {
      comment: '',
      expected: null,
    },
  ];

  for (const { comment, expected } of testCases) {
    test(`should render proper comment for "${comment}"`, () => {
      const res = renderComment(comment);

      assert.strictEqual(res, expected);
    });
  }
});

type ExtendedSchema = {
  [key: string]: OA3.ReferenceObject | (OA31.SchemaObject & { [key: `x-${string}`]: object });
};
function prepareSchemas(schemas: ExtendedSchema) {
  return getDocument({
    components: {
      schemas: schemas as OA3.ComponentsObject['schemas'],
    },
  });
}
