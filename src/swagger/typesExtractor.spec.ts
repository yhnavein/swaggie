import { test, describe } from 'node:test';
import assert from 'node:assert';
import type { OpenAPIV3 as OA3, OpenAPIV3_1 as OA31 } from 'openapi-types';
import type { ClientOptions } from '../types';
import { getParameterType, getTypeFromSchema } from './typesExtractor';
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
        const res = getParameterType(param, options);

        assert.strictEqual(res, expected);
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

    const res = getParameterType(param, options);

    assert.strictEqual(res, 'Item[]');
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

        assert.strictEqual(res, expected);
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
  });

  describe('enums', () => {
    test('should process string enums correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'string',
        enum: ['Admin', 'User', 'Guest'],
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(res, `("Admin" | "User" | "Guest")`);
    });

    test('should process numeric enums correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'number',
        enum: [1, 2, 3],
      };
      const res = getTypeFromSchema(schema, opts);

      assertEqualIgnoringWhitespace(res, '(1 | 2 | 3)');
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

        assert.strictEqual(res, expected);
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

        assert.strictEqual(res, expected);
      });
    }
  });
});
