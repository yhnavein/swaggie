import { test, describe } from 'node:test';
import assert from 'node:assert';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import {
  type VerifableDocument,
  escapeReservedWords,
  verifyDocumentSpec,
  groupOperationsByGroupName,
  getBestResponse,
  prepareOutputFilename,
} from './utils';
import type { ApiOperation } from '../types';

describe('escapeReservedWords', () => {
  const testCases = [
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
    { input: 'Burrito', expected: 'Burrito' },
    { input: 'return', expected: '_return' },
  ];

  for (const { input, expected } of testCases) {
    test(`should escape ${input} correctly`, async () => {
      const res = escapeReservedWords(input);

      assert.strictEqual(res, expected);
    });
  }
});

describe('verifyDocumentSpec', () => {
  test('should accept OpenAPI 3', () => {
    assert.doesNotThrow(() => {
      const res = verifyDocumentSpec({
        openapi: '3.0.3',
        info: {
          title: 'test',
          version: '1.0',
        },
        paths: {},
      });

      assert(res);
    });
  });

  test('should reject Swagger 2.0 document', () => {
    assert.throws(() => {
      const res = verifyDocumentSpec({
        swagger: '2.0',
      } as VerifableDocument);

      assert(!res);
    }, /not supported/);
  });

  test('should reject an empty document', () => {
    assert.throws(() => {
      const res = verifyDocumentSpec(null as any);

      assert(!res);
    }, /is empty/);
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

      assert.deepStrictEqual(res, expected);
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

    assert(res);
    assert(res.HealthCheck);
    assert.strictEqual(res.HealthCheck.length, 1);
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

    assert(res);
    assert(res.HealthCheck);
    assert.strictEqual(res.HealthCheck.length, 2);
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

    assert(res);
    assert(res.HealthCheck);
    assert.strictEqual(res.HealthCheck.length, 1);
    assert(res.Illness);
    assert.strictEqual(res.Illness.length, 1);
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

      assert.strictEqual(res, expected);
    });
  }
});

describe('getBestResponse', () => {
  test('handles no responses', () => {
    const op: OA3.OperationObject = {
      responses: {},
    };

    const [res] = getBestResponse(op);

    assert.strictEqual(res, null);
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

    assert.deepStrictEqual(res, {
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

        assert.deepStrictEqual(respContentType, expected);
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

    assert.deepStrictEqual(res, {
      schema: {
        $ref: '#/components/schemas/TestObject',
      },
    });
  });
});
