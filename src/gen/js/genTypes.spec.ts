import genTypes from './genTypes';

const emptySpec: ApiSpec = {
  swagger: '2.0',
  info: {
    title: 'Some Api',
    version: 'v1',
  },
  paths: [],
  definitions: [],
  accepts: [],
  contentTypes: [],
};

describe('genTypes', () => {
  it(`empty definitions is handled properly`, () => {
    const res = genTypes(emptySpec, {}, {} as any);

    expect(res).toBe('');
  });

  describe('enums', () => {
    describe('int-serialized simple enums', () => {
      it(`Swashbuckle's enum should be handled correctly`, () => {
        const res = genTypes(
          emptySpec,
          {
            SomeEnum: {
              format: 'int32',
              enum: [0, 1],
              type: 'integer',
            },
          },
          {} as any
        );

        expect(res).toBeDefined();
        expect(res.trim()).toBe(`export type SomeEnum = 0 | 1;`);
      });

      it(`NSwag's enum should be handled correctly`, () => {
        const res = genTypes(
          emptySpec,
          {
            SomeEnum: {
              type: 'integer',
              format: 'int32',
              enum: ['Active', 'Disabled'],
              fullEnum: {
                Active: 0,
                Disabled: 1,
              },
            },
          },
          {} as any
        );

        expect(res).toBeDefined();
        expect(res.trim()).toBe(`export enum SomeEnum {
  Active = 0,
  Disabled = 1,
}`);
      });
    });

    describe('string-serialized simple enums', () => {
      it(`Swashbuckle's enum should be handled correctly`, () => {
        const res = genTypes(
          emptySpec,
          {
            SomeEnum: {
              enum: ['Active', 'Disabled'],
              type: 'string',
            },
          },
          {} as any
        );

        expect(res).toBeDefined();
        expect(res.trim()).toBe(`export type SomeEnum = 'Active' | 'Disabled';`);
      });
    });
  });

  describe('enums', () => {
    it(`should handle number-based x-enums correctly`, () => {
      const res = genTypes(
        emptySpec,
        {
          GrantType: {
            type: 'integer',
            description: '',
            'x-enumNames': ['None', 'Password', 'External', 'Internal'],
            enum: [0, 1, 2, 3],
          },
        },
        {} as any
      );

      expect(res).toBeDefined();
      expect(res.trim()).toBe(`export enum GrantType {
  None = 0,
  Password = 1,
  External = 2,
  Internal = 3,
}`);
    });

    it(`should handle string-based x-enums correctly`, () => {
      const res = genTypes(
        emptySpec,
        {
          GrantType: {
            type: 'string',
            description: '',
            'x-enumNames': ['None', 'Password', 'External', 'Internal'],
            enum: ['None', 'Password', 'External', 'Internal'],
          },
        },
        {} as any
      );

      expect(res).toBeDefined();
      expect(res.trim()).toBe(`export enum GrantType {
  None = "None",
  Password = "Password",
  External = "External",
  Internal = "Internal",
}`);
    });
  });

  describe('normal objects', () => {
    it(`should handle obj with no required fields`, () => {
      const res = genTypes(
        emptySpec,
        {
          AuthenticationData: {
            type: 'object',
            properties: {
              login: {
                type: 'string',
              },
              password: {
                type: 'string',
              },
            } as any,
          },
        },
        {} as any
      );

      expect(res).toBeDefined();
      expect(res.trim()).toBe(`export interface AuthenticationData {
  login?: string;
  password?: string;
}`);
    });

    it(`should handle obj with all required fields`, () => {
      const res = genTypes(
        emptySpec,
        {
          AuthenticationData: {
            type: 'object',
            properties: {
              login: {
                type: 'string',
              },
              password: {
                type: 'string',
              },
            } as any,
            required: ['login', 'password'],
          },
        },
        {} as any
      );

      expect(res).toBeDefined();
      expect(res.trim()).toBe(`export interface AuthenticationData {
  login: string;
  password: string;
}`);
    });
  });

  describe('objects with read-only fields', () => {
    it(`should ignore read-only fields`, () => {
      const res = genTypes(
        emptySpec,
        {
          PagedAndSortedQuery: {
            properties: {
              isPagingSpecified: {
                readOnly: true,
                type: 'boolean',
              },
              sortField: {
                type: 'string',
              },
            } as any,
            required: [],
            type: 'object',
          },
        },
        {} as any
      );

      expect(res).toBeDefined();
      expect(res.trim()).toBe(`export interface PagedAndSortedQuery {
  sortField?: string;
}`);
    });
  });
});
