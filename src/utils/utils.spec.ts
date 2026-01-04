import { test, describe, expect } from 'bun:test';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import {
  type VerifableDocument,
  escapeIdentifier,
  verifyDocumentSpec,
  groupOperationsByGroupName,
  getBestResponse,
  prepareOutputFilename,
  escapePropName,
  orderBy,
  getBestContentType,
  MyContentType,
} from './utils';
import type { ApiOperation } from '../types';

describe('escapeIdentifier', () => {
  const testCases = [
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
    { input: 'Burrito', expected: 'Burrito' },
    { input: 'return', expected: '_return' },
    { input: '1test', expected: '_1test' },
    { input: 'class', expected: '_class' },
    { input: '$config', expected: '_$config' },
    { input: 'url', expected: '_url' },
    { input: 'function', expected: '_function' },
    { input: 'var', expected: '_var' },
    { input: 'let', expected: '_let' },
    { input: 'const', expected: '_const' },
    { input: '123', expected: '_123' },
    { input: '0variable', expected: '_0variable' },
    { input: 'validIdentifier', expected: 'validIdentifier' },
    { input: '_validIdentifier', expected: '_validIdentifier' },
    { input: '$validIdentifier', expected: '$validIdentifier' },
  ];

  for (const { input, expected } of testCases) {
    test(`should escape ${input} correctly`, async () => {
      const res = escapeIdentifier(input);

      expect(res).toBe(expected);
    });
  }
});

describe('escapePropName', () => {
  const testCases = [
    { input: '', expected: null },
    { input: null, expected: null },
    { input: undefined, expected: null },
    { input: 'Burrito', expected: 'Burrito' },
    { input: '123numeric', expected: '"123numeric"' },
    { input: 'with$dollar', expected: 'with$dollar' }, // $ is not a special character
    { input: 'with-hyphen', expected: '"with-hyphen"' },
    { input: 'with space', expected: '"with space"' },
    { input: 'with.dot', expected: '"with.dot"' },
    { input: 'with@symbol', expected: '"with@symbol"' },
    { input: 'with+plus', expected: '"with+plus"' },
    { input: 'with/slash', expected: '"with/slash"' },
    { input: 'with:colon', expected: '"with:colon"' },
    { input: 'with;semicolon', expected: '"with;semicolon"' },
    { input: 'with,comma', expected: '"with,comma"' },
    { input: 'with(parentheses', expected: '"with(parentheses"' },
    { input: 'with[brackets', expected: '"with[brackets"' },
    { input: 'with{braces', expected: '"with{braces"' },
    { input: 'with|pipe', expected: '"with|pipe"' },
    { input: 'with\\backslash', expected: '"with\\backslash"' },
    { input: 'with?question', expected: '"with?question"' },
    { input: 'with<greater', expected: '"with<greater"' },
    { input: 'with=equals', expected: '"with=equals"' },
    { input: 'with~tilde', expected: '"with~tilde"' },
    { input: 'with`backtick', expected: '"with`backtick"' },
    { input: 'with!exclamation', expected: '"with!exclamation"' },
    { input: 'with#hash', expected: '"with#hash"' },
    { input: 'with%percent', expected: '"with%percent"' },
    { input: 'with^caret', expected: '"with^caret"' },
    { input: 'with&ampersand', expected: '"with&ampersand"' },
    { input: 'with*asterisk', expected: '"with*asterisk"' },
  ];

  for (const { input, expected } of testCases) {
    test(`should escape ${input} correctly`, async () => {
      const res = escapePropName(input);

      expect(res).toBe(expected);
    });
  }
});

describe('verifyDocumentSpec', () => {
  test('should accept OpenAPI 3', () => {
    expect(() => {
      const res = verifyDocumentSpec({
        openapi: '3.0.3',
        info: {
          title: 'test',
          version: '1.0',
        },
        paths: {},
      });

      expect(res).toBeDefined();
    });
  });

  test('should reject Swagger 2.0 document', () => {
    expect(() => {
      const res = verifyDocumentSpec({
        swagger: '2.0',
      } as VerifableDocument);

      expect(res).toBeUndefined();
    }).toThrow(/not supported/);
  });

  test('should reject an empty document', () => {
    expect(() => {
      const res = verifyDocumentSpec(null as any);

      expect(res).toBeUndefined();
    }).toThrow(/is empty/);
  });
});

describe('groupOperationsByGroupName', () => {
  const testCases = [
    { input: [], expected: {} },
    { input: null, expected: {} },
    { input: undefined, expected: {} },
  ];
  for (const { input, expected } of testCases) {
    test(`should handle ${input} as input`, async () => {
      const res = groupOperationsByGroupName(input);

      expect(res).toEqual(expected);
    });
  }

  test('handles single operation', async () => {
    const def: ApiOperation[] = [
      {
        operationId: 'HealthCheck_PerformAllChecks',
        method: 'get',
        group: 'HealthCheck',
        path: '/healthcheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
          },
        },
        tags: ['HealthCheck'],
      },
    ];

    const res = groupOperationsByGroupName(def);

    expect(res).toBeDefined();
    expect(res.HealthCheck).toBeDefined();
    expect(res.HealthCheck.length).toBe(1);
  });

  test('handles two different operations and the same group', async () => {
    const def: ApiOperation[] = [
      {
        operationId: 'HealthCheck_PerformAllChecks',
        method: 'get',
        group: 'HealthCheck',
        path: '/healthcheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
          },
        },
        tags: ['HealthCheck'],
      },
      {
        operationId: 'HealthCheck_SomethingElse',
        method: 'post',
        group: 'HealthCheck',
        path: '/healthcheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
          },
        },
        tags: ['HealthCheck'],
      },
    ];

    const res = groupOperationsByGroupName(def);

    expect(res).toBeDefined();
    expect(res.HealthCheck).toBeDefined();
    expect(res.HealthCheck.length).toBe(2);
  });

  test('handles two different operations and different groups', async () => {
    const def: ApiOperation[] = [
      {
        operationId: 'HealthCheck_PerformAllChecks',
        method: 'get',
        group: 'HealthCheck',
        path: '/healthcheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
          },
        },
        tags: ['HealthCheck'],
      },
      {
        operationId: 'Illness_SomethingElse',
        method: 'get',
        group: 'Illness',
        path: '/illness',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
          },
        },
        tags: ['Illness'],
      },
    ];

    const res = groupOperationsByGroupName(def);

    expect(res).toBeDefined();
    expect(res.HealthCheck).toBeDefined();
    expect(res.HealthCheck.length).toBe(1);
    expect(res.Illness).toBeDefined();
    expect(res.Illness.length).toBe(1);
  });
});

describe('prepareOutputFilename', () => {
  for (const { given, expected } of [
    { given: null, expected: null },
    { given: 'api.ts', expected: 'api.ts' },
    { given: 'api', expected: 'api.ts' },
    { given: 'api/', expected: 'api/index.ts' },
    { given: 'api\\', expected: 'api/index.ts' },
    { given: 'api/api.ts', expected: 'api/api.ts' },
    { given: 'api//api.ts', expected: 'api//api.ts' },
    { given: 'api\\api.ts', expected: 'api/api.ts' },
    { given: 'api/api/', expected: 'api/api/index.ts' },
  ]) {
    test(`handles "${given}" correctly`, () => {
      const res = prepareOutputFilename(given);

      expect(res).toBe(expected);
    });
  }
});

describe('getBestResponse', () => {
  test('handles no responses', () => {
    const op: OA3.OperationObject = {
      responses: {},
    };

    const [res] = getBestResponse(op);

    expect(res).toBeNull();
  });

  test('handles 200 response with text/plain media type', () => {
    const op: OA3.OperationObject = {
      responses: {
        '200': {
          description: 'Success',
          content: {
            'text/plain': {
              schema: {
                $ref: '#/components/schemas/TestObject',
              },
            },
          },
        },
      },
    };

    const [res] = getBestResponse(op);

    expect(res).toEqual({
      schema: {
        $ref: '#/components/schemas/TestObject',
      },
    });
  });

  describe('different response content types', () => {
    const sampleSchema = { $ref: '#/components/schemas/TestObject' };
    const testCases = [
      { contentType: 'application/json', schema: sampleSchema, expected: 'json' },
      { contentType: 'text/json', schema: sampleSchema, expected: 'json' },
      { contentType: 'application/octet-stream', schema: sampleSchema, expected: 'binary' },
      { contentType: 'text/plain', schema: sampleSchema, expected: 'text' },
      { contentType: 'something/wrong', schema: sampleSchema, expected: 'json' },
    ];

    for (const { contentType, schema, expected } of testCases) {
      test(`handles 201 ${contentType} response`, () => {
        const op: OA3.OperationObject = {
          responses: {
            '201': {
              description: 'Success',
              content: {
                [contentType]: {
                  schema,
                },
              },
            },
          },
        };

        const [, respContentType] = getBestResponse(op);

        expect(respContentType).toBe(expected as MyContentType);
      });
    }
  });

  test('handles multiple responses', () => {
    const op: OA3.OperationObject = {
      responses: {
        '301': {
          description: 'Moved Permanently',
          content: {
            'text/plain': {
              schema: {
                $ref: '#/components/schemas/Wrong',
              },
            },
          },
        },
        '203': {
          description: 'Success',
          content: {
            'text/plain': {
              schema: {
                $ref: '#/components/schemas/TestObject',
              },
            },
          },
        },
      },
    };

    const [res] = getBestResponse(op);

    expect(res).toEqual({
      schema: {
        $ref: '#/components/schemas/TestObject',
      },
    });
  });
});

describe('orderBy', () => {
  test('should order by a key', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const res = orderBy(arr, 'a');

    expect(res).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  test('should nullish data', () => {
    const res = orderBy(null, 'a');

    expect(res).toEqual([]);
  });
});

describe('getBestContentType', () => {
  test('should return the best content type', () => {
    const res = getBestContentType({
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/TestObject' } },
      },
    });

    expect(res).toEqual([
      {
        schema: {
          $ref: '#/components/schemas/TestObject',
        },
      },
      'json',
    ]);
  });

  test('should handle empty content', () => {
    const res = getBestContentType({
      content: {},
    });

    expect(res).toEqual([null, null]);
  });
});
