import { test, describe, expect } from 'bun:test';
import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';
import { type ClientOptions } from '../types';
import {
  getParameterType,
  getTypeFromSchema,
  getSafeIdentifier,
  getRefCompositeTypes,
  resolveOptions,
} from './typesExtractor';
import { assertEqualIgnoringWhitespace, getClientOptions } from '../../test/test.utils';

describe('getParameterType', () => {
  describe('empty cases', () => {
    type TestCase = {
      param?: OA3.ParameterObject | OA3.MediaTypeObject | null | any;
      options: Partial<ClientOptions>;
      expected: string;
    };

    const testCases: TestCase[] = [
      { param: null, options: { preferAny: true }, expected: 'any' },
      { param: undefined, options: {}, expected: 'unknown' },
      { param: {}, options: {}, expected: 'unknown' },
      { param: [], options: {}, expected: 'unknown' },
      { param: [], options: { preferAny: true }, expected: 'any' },
      {
        param: { name: 'a', in: 'query' } as OA3.ParameterObject,
        options: {},
        expected: 'unknown',
      },
    ];

    for (const { param, options, expected } of testCases) {
      test(`should process ${param} correctly`, async () => {
        const res = getParameterType(param, resolveOptions(options));

        expect(res).toBe(expected);
      });
    }
  });

  test('standard case', async () => {
    const param: OA3.ParameterObject = {
      name: 'items',
      in: 'query',
      schema: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Item',
        },
      },
    };
    const options = {};

    const res = getParameterType(param, resolveOptions(options));

    expect(res).toBe('Item[]');
  });
});

describe('getTypeFromSchema', () => {
  const opts = getClientOptions();

  describe('arrays', () => {
    type TestCase = {
      schema: OA3.SchemaObject;
      expected: string;
    };
    const testCases: TestCase[] = [
      { schema: { type: 'array', items: {} }, expected: 'unknown[]' },
      { schema: { type: 'array', items: null }, expected: 'unknown[]' },
      {
        schema: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
        expected: 'Item[]',
      },
      { schema: { type: 'array', items: { type: 'string' } }, expected: 'string[]' },
      { schema: { type: 'array', items: { type: 'number' } }, expected: 'number[]' },
      { schema: { type: 'array', items: { type: 'boolean' } }, expected: 'boolean[]' },
      { schema: { type: 'array', items: { type: 'object' } }, expected: 'unknown[]' },
      {
        schema: {
          type: 'array',
          items: {
            enum: ['Admin', 'User', 'Guest'],
            type: 'string',
          },
        },
        expected: '("Admin" | "User" | "Guest")[]',
      },
    ];

    for (const { schema, expected } of testCases) {
      test(`should process ${JSON.stringify(schema)} correctly`, async () => {
        const res = getTypeFromSchema(schema, opts);

        expect(res).toBe(expected);
      });
    }

    test('should process array of inline objects correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'array',
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            name: { type: 'string', description: 'Name of the item' },
            id: { type: 'number' },
          },
        },
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(
        res,
        `{
        name?: string;
        id: number;
      }[]`
      );
    });

    test('should process array of arrays correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'number',
          },
        },
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(res, 'number[][]');
    });

    test('should process array of arrays with objects correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'array',
        items: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Item',
          },
        },
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(res, 'Item[][]');
    });
  });

  describe('objects', () => {
    test('should process deep objects correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'object',
        required: ['id'],
        properties: {
          name: { type: 'string', description: 'Name of the item' },
          id: { type: 'number' },
          evenDeeper: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
          },
        },
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(
        res,
        `{
        name?: string;
        id: number;

        evenDeeper?: {
          foo?: string;
        };
      }`
      );
    });

    test('should process deep objects with special characters correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'object',
        properties: {
          deep: {
            type: 'object',
            properties: {
              'EC2 & ECS': {
                $ref: '#/components/schemas/User',
              },
              'Some/Strange + Names <=#$%&*?>': {
                type: 'string',
              },
            },
          },
        },
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(
        res,
        `{
        deep?: {
          "EC2 & ECS"?: User;
          "Some/Strange + Names <=#$%&*?>"?: string;
        };
      }`
      );
    });
  });

  describe('enums', () => {
    test('should process string enums correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'string',
        enum: ['Admin', 'User', 'Guest'],
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(res, `"Admin" | "User" | "Guest"`);
    });

    test('should process numeric enums correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'number',
        enum: [1, 2, 3],
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(res, '1 | 2 | 3');
    });
  });

  describe('basic types', () => {
    type TestCase = {
      schema: OA3.SchemaObject | OA3.ReferenceObject;
      expected: string;
    };

    const testCases: TestCase[] = [
      { schema: { type: 'string' }, expected: 'string' },
      { schema: { type: 'string', format: 'date-time' }, expected: 'Date' },
      { schema: { type: 'string', format: 'date' }, expected: 'Date' },
      { schema: { type: 'string', format: 'binary' }, expected: 'File' },
      { schema: { type: 'number' }, expected: 'number' },
      { schema: { type: 'integer' }, expected: 'number' },
      { schema: { type: 'boolean' }, expected: 'boolean' },
      { schema: { $ref: '' }, expected: 'unknown' },
      { schema: { $ref: '#/components/' }, expected: 'unknown' },
      { schema: { $ref: '#/components/schema/Test' }, expected: 'Test' },
      { schema: null, expected: 'unknown' },
      { schema: undefined, expected: 'unknown' },
      { schema: {}, expected: 'unknown' },
    ];

    for (const { schema, expected } of testCases) {
      test(`should process ${JSON.stringify(schema)} correctly`, async () => {
        const res = getTypeFromSchema(schema, opts);

        expect(res).toBe(expected);
      });
    }
  });

  describe('composites', () => {
    type TestCase = {
      schema: OA31.SchemaObject;
      expected: string;
    };

    const testCases: TestCase[] = [
      { schema: { allOf: [{ type: 'string' }, { type: 'number' }] }, expected: 'string & number' },
      { schema: { oneOf: [{ type: 'string' }, { type: 'number' }] }, expected: 'string | number' },
      {
        schema: { anyOf: [{ type: 'number' }, { type: 'string' }, { type: 'null' }] },
        expected: 'number | string | null',
      },
      {
        schema: {
          anyOf: [
            { type: 'number' },
            { type: 'array', items: { type: 'string' } },
            { type: 'array', items: { type: 'number' } },
            { type: 'null' },
          ],
        },
        expected: 'number | string[] | number[] | null',
      },
      { schema: {}, expected: 'unknown' },
    ];

    for (const { schema, expected } of testCases) {
      test(`should ${JSON.stringify(schema)} match ${expected}`, async () => {
        const res = getTypeFromSchema(schema, opts);

        expect(res).toBe(expected);
      });
    }
  });

  describe('OpenAPI 3.0 nullable', () => {
    type TestCase = {
      schema: OA3.SchemaObject;
      expected: string;
    };

    describe('strategy: include', () => {
      const opts = getClientOptions({ nullableStrategy: 'include' });

      const testCases: TestCase[] = [
        { schema: { type: 'array', items: {}, nullable: true }, expected: 'unknown[] | null' },
        {
          schema: { type: 'array', items: { $ref: '#/components/schemas/Item' }, nullable: true },
          expected: 'Item[] | null',
        },
        {
          schema: { type: 'array', items: { type: 'string' }, nullable: true },
          expected: 'string[] | null',
        },
        {
          schema: { type: 'array', items: { type: 'number' }, nullable: true },
          expected: 'number[] | null',
        },
        {
          schema: { type: 'array', items: { type: 'boolean', nullable: true }, nullable: true },
          expected: '(boolean | null)[] | null',
        },
        {
          schema: {
            type: 'array',
            items: { type: 'string', enum: ['Admin', 'User', 'Guest'], nullable: true },
          },
          expected: '("Admin" | "User" | "Guest" | null)[]',
        },
        {
          schema: { type: 'boolean', nullable: true },
          expected: 'boolean | null',
        },
        {
          schema: { type: 'string', format: 'date-time', nullable: true },
          expected: 'Date | null',
        },
        {
          schema: { type: 'string', nullable: true },
          expected: 'string | null',
        },
        {
          schema: { type: 'number', nullable: true },
          expected: 'number | null',
        },
        {
          schema: { type: 'object', nullable: true },
          expected: 'unknown | null',
        },
        {
          schema: { type: 'object', properties: { name: { type: 'string' } }, nullable: true },
          expected: '{ name?: string; } | null',
        },
        {
          schema: { nullable: true },
          expected: 'unknown | null',
        },
        {
          schema: { allOf: [{ type: 'string' }, { type: 'number' }], nullable: true },
          expected: 'string & number | null',
        },
        {
          schema: { oneOf: [{ type: 'string' }, { type: 'number' }], nullable: true },
          expected: 'string | number | null',
        },
        {
          schema: {
            oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }],
            nullable: true,
          } as OA3.SchemaObject,
          expected: 'string | number | null',
        },
      ];

      for (const { schema, expected } of testCases) {
        test(`should process ${JSON.stringify(schema)} correctly`, async () => {
          const res = getTypeFromSchema(schema, opts);

          expect(res).toBe(expected);
        });
      }
    });

    describe('strategy: ignore (default)', () => {
      const opts = getClientOptions({ nullableStrategy: 'ignore' });

      const testCases: TestCase[] = [
        { schema: { type: 'string', nullable: true }, expected: 'string' },
        { schema: { type: 'number', nullable: true }, expected: 'number' },
        { schema: { type: 'boolean', nullable: true }, expected: 'boolean' },
        {
          schema: { type: 'string', format: 'date-time', nullable: true },
          expected: 'Date',
        },
        { schema: { type: 'array', items: {}, nullable: true }, expected: 'unknown[]' },
        {
          schema: { type: 'array', items: { $ref: '#/components/schemas/Item' }, nullable: true },
          expected: 'Item[]',
        },
        {
          schema: { type: 'array', items: { type: 'boolean', nullable: true }, nullable: true },
          expected: 'boolean[]',
        },
        { schema: { nullable: true }, expected: 'unknown' },
        {
          schema: { allOf: [{ type: 'string' }, { type: 'number' }], nullable: true },
          expected: 'string & number',
        },
        {
          schema: { oneOf: [{ type: 'string' }, { type: 'number' }], nullable: true },
          expected: 'string | number',
        },
      ];

      for (const { schema, expected } of testCases) {
        test(`should process ${JSON.stringify(schema)} as ${expected}`, async () => {
          expect(getTypeFromSchema(schema, opts)).toBe(expected);
        });
      }
    });

    describe('strategy: nullableAsOptional', () => {
      const opts = getClientOptions({ nullableStrategy: 'nullableAsOptional' });

      const testCases: TestCase[] = [
        // nullableAsOptional does not affect the type string itself — no | null suffix
        { schema: { type: 'string', nullable: true }, expected: 'string' },
        { schema: { type: 'number', nullable: true }, expected: 'number' },
        { schema: { type: 'boolean', nullable: true }, expected: 'boolean' },
        {
          schema: { type: 'string', format: 'date-time', nullable: true },
          expected: 'Date',
        },
        { schema: { type: 'array', items: {}, nullable: true }, expected: 'unknown[]' },
        {
          schema: { type: 'array', items: { $ref: '#/components/schemas/Item' }, nullable: true },
          expected: 'Item[]',
        },
        { schema: { nullable: true }, expected: 'unknown' },
        {
          schema: { allOf: [{ type: 'string' }, { type: 'number' }], nullable: true },
          expected: 'string & number',
        },
      ];

      for (const { schema, expected } of testCases) {
        test(`should process ${JSON.stringify(schema)} as ${expected}`, async () => {
          expect(getTypeFromSchema(schema, opts)).toBe(expected);
        });
      }
    });
  });

  describe('OpenAPI 3.1 nullable (type array)', () => {
    type TestCase = {
      schema: OA31.SchemaObject;
      expected: string;
    };

    describe('strategy: include', () => {
      const opts = getClientOptions({ nullableStrategy: 'include' });

      const testCases: TestCase[] = [
        { schema: { type: ['string', 'null'] }, expected: 'string | null' },
        { schema: { type: ['number', 'null'] }, expected: 'number | null' },
        { schema: { type: ['integer', 'null'] }, expected: 'number | null' },
        { schema: { type: ['boolean', 'null'] }, expected: 'boolean | null' },
        {
          schema: { type: ['string', 'null'], format: 'date-time' },
          expected: 'Date | null',
        },
        {
          schema: { type: ['string', 'null'], format: 'date' },
          expected: 'Date | null',
        },
        {
          schema: { type: ['string', 'null'], format: 'binary' },
          expected: 'File | null',
        },
        // Only 'null' in type array
        { schema: { type: ['null'] }, expected: 'null' },
        // Multiple non-null types
        { schema: { type: ['string', 'number', 'null'] }, expected: 'string | number | null' },
        // Array item that is OA3.1 nullable
        {
          schema: {
            type: 'array',
            items: { type: ['string', 'null'] },
          },
          expected: '(string | null)[]',
        },
        {
          schema: {
            type: 'array',
            items: { type: ['boolean', 'null'] },
          },
          expected: '(boolean | null)[]',
        },
        // Outer array itself is nullable
        {
          schema: { type: ['array', 'null'], items: { type: 'string' } },
          expected: 'string[] | null',
        },
      ];

      for (const { schema, expected } of testCases) {
        test(`should process ${JSON.stringify(schema)} as ${expected}`, async () => {
          expect(getTypeFromSchema(schema, opts)).toBe(expected);
        });
      }
    });

    describe('strategy: ignore (default)', () => {
      const opts = getClientOptions({ nullableStrategy: 'ignore' });

      const testCases: TestCase[] = [
        { schema: { type: ['string', 'null'] }, expected: 'string' },
        { schema: { type: ['number', 'null'] }, expected: 'number' },
        { schema: { type: ['boolean', 'null'] }, expected: 'boolean' },
        {
          schema: { type: ['string', 'null'], format: 'date-time' },
          expected: 'Date',
        },
        { schema: { type: ['string', 'number', 'null'] }, expected: 'string | number' },
        {
          schema: { type: 'array', items: { type: ['string', 'null'] } },
          expected: 'string[]',
        },
        {
          schema: { type: ['array', 'null'], items: { type: 'string' } },
          expected: 'string[]',
        },
      ];

      for (const { schema, expected } of testCases) {
        test(`should process ${JSON.stringify(schema)} as ${expected}`, async () => {
          expect(getTypeFromSchema(schema, opts)).toBe(expected);
        });
      }
    });

    describe('strategy: nullableAsOptional', () => {
      const opts = getClientOptions({ nullableStrategy: 'nullableAsOptional' });

      const testCases: TestCase[] = [
        // nullableAsOptional strips null from the type string; optionality is applied at property level
        { schema: { type: ['string', 'null'] }, expected: 'string' },
        { schema: { type: ['number', 'null'] }, expected: 'number' },
        { schema: { type: ['boolean', 'null'] }, expected: 'boolean' },
        {
          schema: { type: ['string', 'null'], format: 'date-time' },
          expected: 'Date',
        },
        { schema: { type: ['string', 'number', 'null'] }, expected: 'string | number' },
        {
          schema: { type: 'array', items: { type: ['string', 'null'] } },
          expected: 'string[]',
        },
      ];

      for (const { schema, expected } of testCases) {
        test(`should process ${JSON.stringify(schema)} as ${expected}`, async () => {
          expect(getTypeFromSchema(schema, opts)).toBe(expected);
        });
      }
    });
  });
});

describe('getSafeIdentifier', () => {
  const testCases = [
    { input: '', expected: '' },
    { input: undefined, expected: '' },
    { input: 'validName', expected: 'validName' },
    { input: 'Valid-Name', expected: 'Valid_Name' },
    { input: 'name with spaces', expected: 'name_with_spaces' },
    { input: 'name.with.dots', expected: 'name_with_dots' },
    { input: 'name@with#symbols', expected: 'name_with_symbols' },
    { input: '123number', expected: '123number' },
    { input: 'User-Profile', expected: 'User_Profile' },
    { input: 'API:Response', expected: 'API_Response' },
    { input: 'test/path', expected: 'test_path' },
    { input: 'test[brackets]', expected: 'test_brackets_' },
    { input: 'test{braces}', expected: 'test_braces_' },
  ];

  for (const { input, expected } of testCases) {
    test(`should convert "${input}" to "${expected}"`, async () => {
      const res = getSafeIdentifier(input);

      expect(res).toBe(expected);
    });
  }
});

describe('getRefCompositeTypes', () => {
  test('should extract reference types from allOf', () => {
    const schema: OA3.SchemaObject = {
      allOf: [
        { $ref: '#/components/schemas/BaseUser' },
        { $ref: '#/components/schemas/UserProfile' },
        {
          type: 'object',
          properties: {
            additionalData: { type: 'string' },
          },
        },
      ],
    };

    const res = getRefCompositeTypes(schema);

    expect(res).toEqual(['BaseUser', 'UserProfile']);
  });

  test('should handle empty allOf', () => {
    const schema: OA3.SchemaObject = {
      allOf: [],
    };

    const res = getRefCompositeTypes(schema);

    expect(res).toEqual([]);
  });

  test('should handle allOf with only inline schemas', () => {
    const schema: OA3.SchemaObject = {
      allOf: [
        {
          type: 'object',
          properties: {
            field1: { type: 'string' },
          },
        },
        {
          type: 'object',
          properties: {
            field2: { type: 'number' },
          },
        },
      ],
    };

    const res = getRefCompositeTypes(schema);

    expect(res).toEqual([]);
  });

  test('should handle mixed allOf with refs and inline schemas', () => {
    const schema: OA3.SchemaObject = {
      allOf: [
        { $ref: '#/components/schemas/Base' },
        {
          type: 'object',
          properties: {
            extra: { type: 'string' },
          },
        },
        { $ref: '#/components/schemas/Extension' },
      ],
    };

    const res = getRefCompositeTypes(schema);

    expect(res).toEqual(['Base', 'Extension']);
  });
});
