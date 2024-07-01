import { expect } from 'chai';
import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';

import genTypes, { renderComment } from './genTypes';
import { getClientOptions, getDocument } from '../../utils';

describe('genTypes', () => {
  const opts = getClientOptions();

  it('should handle empty components properly', () => {
    const res = genTypes(getDocument({ components: {} }), opts);

    expect(res).to.be.equal('');
  });

  it('should handle empty components schemas properly', () => {
    const res = genTypes(getDocument({ components: { schemas: {} } }), opts);

    expect(res).to.be.equal('');
  });

  it('should handle schema with reference only', () => {
    const res = genTypes(
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

    expect(res).to.be.ok;
    expect(res.trim()).to.be.equal(
      `export type A = B;
export interface B {
}`
    );
  });

  describe('enums', () => {
    it('should handle simple enums correctly', () => {
      const res = genTypes(
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

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(
        `export type SimpleEnum = 0 | 1;

// Feature is activated or not
export type StringEnum = "Active" | "Disabled";`
      );
    });

    it('should handle extended enums correctly', () => {
      const res = genTypes(
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

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(
        `export enum XEnums {
  High = 2,
  Medium = 1,
  Low = 0,
}

export enum XEnumVarnames {
  High = 2,
  Medium = 1,
  Low = 0,
}

// How big the feature is
export enum XEnumsString {
  Large = "L",
  Medium = "M",
  Small = "S",
}`
      );
    });

    it('should handle OpenApi 3.1 enums', () => {
      const res = genTypes(
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

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(
        `export enum Priority {
  High = 2,
  Medium = 1,
  Low = 0,
}

// How big the feature is
export enum Size {
  Large = "L",
  Medium = "M",
  Small = "S",
}`
      );
    });

    //     it("should handle NSwag's enum correctly", () => {
    //       const res = genTypes(
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

    //       expect(res).to.be.ok;
    //       expect(res.trim()).to.be.equal(`export enum SomeEnum {
    //   Active = 0,
    //   Disabled = 1,
    // }`);
    //     });
  });

  describe('objects', () => {
    it('should handle obj with no required fields', () => {
      const res = genTypes(
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

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(`export interface AuthenticationData {
  login?: string;
  password?: string;}

export interface Empty {
}`);
    });

    it('should handle obj with required fields', () => {
      const res = genTypes(
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

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(`export interface AuthenticationData {
  login: string;
  password: string;
  rememberMe?: boolean;}`);
    });
  });

  describe('inheritance', () => {
    describe('allOf', () => {
      it('should handle 2 allOf correctly (most common case)', () => {
        const res = genTypes(
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

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal(`export interface AuthenticationData extends BasicAuth {
  rememberMe?: boolean;}`);
      });

      it('should handle many allOf correctly', () => {
        const res = genTypes(
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

        expect(res).to.be.ok;
        expect(res.trim()).to.be
          .equal(`export interface AuthenticationData extends LoginPart, PasswordPart {
  rememberMe: boolean;
  signForSpam?: boolean;}`);
      });
    });

    // Use of `anyOf` and `oneOf` is implemented in the same and very simple way
    // We just list all the types in the union. This is close enough to the truth
    // and should be convenient for the end user of Swaggie.

    describe('anyOf', () => {
      it('should handle 1 anyOf with reference correctly', () => {
        const res = genTypes(
          prepareSchemas({
            AuthenticationData: {
              anyOf: [{ $ref: '#/components/schemas/BasicAuth' }],
            },
          }),
          opts
        );

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal('export type AuthenticationData = BasicAuth;');
      });

      it('should handle 2 anyOfs with reference correctly', () => {
        const res = genTypes(
          prepareSchemas({
            AuthenticationData: {
              anyOf: [
                { $ref: '#/components/schemas/BasicAuth' },
                { $ref: '#/components/schemas/OAuth2' },
              ],
            },
          }),
          opts
        );

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal('export type AuthenticationData = BasicAuth | OAuth2;');
      });
    });

    describe('oneOf', () => {
      it('should handle 1 anyOf with reference correctly', () => {
        const res = genTypes(
          prepareSchemas({
            AuthenticationData: {
              oneOf: [{ $ref: '#/components/schemas/BasicAuth' }],
            },
          }),
          opts
        );

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal('export type AuthenticationData = BasicAuth;');
      });

      it('should handle 2 anyOfs with reference correctly', () => {
        const res = genTypes(
          prepareSchemas({
            AuthenticationData: {
              oneOf: [
                { $ref: '#/components/schemas/BasicAuth' },
                { $ref: '#/components/schemas/OAuth2' },
              ],
            },
          }),
          opts
        );

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal('export type AuthenticationData = BasicAuth | OAuth2;');
      });
    });
  });
});

describe('renderComment', () => {
  it('should render proper multiline comment with trimming', () => {
    const comment = `   Quite a lenghty comment
   With at least two lines    `;
    const res = renderComment(comment);

    expect(res).to.be.equal(` /**
  * Quite a lenghty comment
  * With at least two lines
  */`);
  });

  const testCases = [
    {
      comment: 'One liner',
      expected: '// One liner',
    },
    {
      comment: '   One liner   ',
      expected: '// One liner',
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
    it(`should render proper comment for "${comment}"`, () => {
      const res = renderComment(comment);

      expect(res).to.be.equal(expected);
    });
  }
});

type ExtendedSchema = {
  [key: string]: OA3.ReferenceObject | (OA31.SchemaObject & { [key: `x-${string}`]: any });
};
function prepareSchemas(schemas: ExtendedSchema) {
  return getDocument({
    components: {
      schemas: schemas as OA3.ComponentsObject['schemas'],
    },
  });
}
