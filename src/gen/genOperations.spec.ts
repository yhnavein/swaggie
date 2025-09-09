import { test, describe } from 'node:test';
import assert from 'node:assert';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import {
  prepareOperations,
  fixDuplicateOperations,
  getOperationName,
  getParamName,
  getParams,
} from './genOperations';
import type { ApiOperation } from '../types';
import { getClientOptions } from '../../test/test.utils';

describe('prepareOperations', () => {
  const opts = getClientOptions();

  describe('parameters', () => {
    test('should prepare parameter types for use in templates', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPetById',
          method: 'get',
          path: '/pet/{petId}',
          parameters: [
            {
              name: 'Org-ID',
              in: 'header',
              required: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'OrgType',
              in: 'query',
              required: false,
              allowEmptyValue: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'petId',
              in: 'path',
              required: false,
              schema: {
                type: 'number',
                format: 'int64',
              },
            },
          ],
          responses: {},
          group: null,
        },
      ];

      const [res] = prepareOperations(ops, opts);

      assert.strictEqual(res.name, 'getPetById');
      assert.strictEqual(res.method, 'GET');
      assert.strictEqual(res.body, null);
      assert.strictEqual(res.returnType, 'unknown');

      const headerParam = res.headers.pop();
      assert.strictEqual(headerParam.name, 'orgID');
      assert.strictEqual(headerParam.originalName, 'Org-ID');
      assert.strictEqual(headerParam.type, 'string');
      assert.strictEqual(headerParam.optional, false);

      const queryParam = res.query.pop();
      assert.strictEqual(queryParam.name, 'orgType');
      assert.strictEqual(queryParam.originalName, 'OrgType');
      assert.strictEqual(queryParam.type, 'string');
      assert.strictEqual(queryParam.optional, true);

      assert.strictEqual(res.parameters.length, 3);
      assert.deepStrictEqual(
        res.parameters.map((p) => p.name),
        ['orgID', 'orgType', 'petId']
      );
      assert.deepStrictEqual(
        res.parameters.map((p) => p.skippable ?? false),
        [false, true, true]
      );
    });

    test('should escape parameter names that are used internally', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPetById',
          method: 'get',
          path: '/pet/{petId}',
          parameters: [
            {
              name: 'url',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: '$config',
              in: 'query',
              required: false,
              allowEmptyValue: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'axios',
              in: 'query',
              required: false,
              allowEmptyValue: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'http',
              in: 'header',
              required: false,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {},
          group: null,
        },
      ];

      const [{ parameters }] = prepareOperations(ops, opts);

      assert.deepStrictEqual(
        parameters.map((p) => p.name),
        ['_url', '_config', '_axios', '_http']
      );
    });

    test('should handle empty parameters', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPetById',
          method: 'get',
          path: '/pet/{petId}',
          responses: {},
          group: null,
        },
        {
          operationId: 'getPetById2',
          method: 'get',
          path: '/pets/{petId}',
          parameters: [],
          responses: {},
          group: null,
        },
      ];

      const [op1, op2] = prepareOperations(ops, opts);

      assert.deepStrictEqual(op1.parameters, []);
      assert.deepStrictEqual(op2.parameters, []);
    });

    test('should prepare URL correctly', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'get1',
          method: 'get',
          path: '/pet/{petId}',
          responses: {},
          group: null,
        },
        {
          operationId: 'get2',
          method: 'get',
          path: '/users/{userId}/Wrong{/Path}',
          parameters: [],
          responses: {},
          group: null,
        },
        {
          operationId: 'get3',
          method: 'get',
          path: '/users/{}/Wrong{',
          parameters: [],
          responses: {},
          group: null,
        },
      ];

      const [op1, op2, op3] = prepareOperations(ops, opts);

      assert.strictEqual(op1.url, '/pet/${encodeURIComponent(`${petId}`)}');
      assert.strictEqual(op2.url, '/users/${encodeURIComponent(`${userId}`)}/Wrong{/Path}');
      assert.strictEqual(op3.url, '/users/{}/Wrong{');
    });

    test('should not mark parameters as skippable if there is required parameter after them', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPetById',
          method: 'get',
          path: '/pet/{petId}',
          parameters: [
            {
              name: 'orgId',
              in: 'query',
              required: false,
              schema: {
                type: 'number',
              },
            },
            {
              name: 'orgType',
              in: 'query',
              required: false,
              allowEmptyValue: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'petId',
              in: 'path',
              required: true,
              schema: {
                type: 'number',
                format: 'int64',
              },
            },
            {
              name: 'groupId',
              in: 'query',
              required: false,
              schema: {
                type: 'number',
              },
            },
          ],
          responses: {},
          group: null,
        },
      ];

      const [{ parameters }] = prepareOperations(ops, opts);

      assert.strictEqual(parameters.length, 4);
      assert.deepStrictEqual(
        parameters.map((p) => p.skippable ?? false),
        [false, false, false, true]
      );
    });

    describe('requestBody (JSON)', () => {
      test('should handle requestBody with ref type', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet',
                  },
                },
              },
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, opts);
        const expectedBodyParam = {
          contentType: 'json',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'Pet',
          original: ops[0].requestBody,
        };

        assert.deepStrictEqual(op1.body, expectedBodyParam);
        assert.deepStrictEqual(op1.parameters, [expectedBodyParam]);
      });

      type TestCase = {
        schema: OA3.SchemaObject;
        expectedType: string;
      };

      const testCases: TestCase[] = [
        { schema: { type: 'string' }, expectedType: 'string' },
        {
          schema: {
            items: {
              format: 'int64',
              type: 'integer',
            },
            nullable: true,
            type: 'array',
          },
          expectedType: 'number[]',
        },
        {
          schema: {
            oneOf: [{ $ref: '#/components/schemas/User' }],
          },
          expectedType: 'User',
        },
        {
          schema: {
            anyOf: [
              { $ref: '#/components/schemas/User' },
              { $ref: '#/components/schemas/Account' },
            ],
          },
          expectedType: 'User | Account',
        },
        {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/User' },
              { $ref: '#/components/schemas/Account' },
            ],
          },
          expectedType: 'User & Account',
        },
      ];

      for (const { schema, expectedType } of testCases) {
        test(`should handle requestBody with ${schema} schema`, () => {
          const ops: ApiOperation[] = [
            {
              operationId: 'createPet',
              method: 'post',
              path: '/pet',
              requestBody: {
                content: {
                  'application/json': {
                    schema,
                  },
                },
              },
              responses: {},
              group: null,
            },
          ];

          const [op1] = prepareOperations(ops, opts);
          const expectedBodyParam = {
            contentType: 'json',
            name: 'body',
            optional: true,
            skippable: true,
            originalName: 'body',
            type: expectedType,
            original: ops[0].requestBody,
          };

          assert.deepStrictEqual(op1.body, expectedBodyParam);
          assert.deepStrictEqual(op1.parameters, [expectedBodyParam]);
        });
      }

      test('should handle requestBody along with other parameters', () => {
        const ops: ExtendedApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            parameters: [
              {
                name: 'orgId',
                in: 'query',
                required: true,
                schema: {
                  type: 'number',
                },
              },
            ],
            requestBody: {
              required: true,
              'x-name': 'pet-body',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet',
                  },
                },
              },
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, opts);
        const expectedBodyParam = {
          contentType: 'json',
          name: 'petBody',
          optional: false,
          originalName: 'pet-body',
          type: 'Pet',
          original: ops[0].requestBody,
        };

        assert.deepStrictEqual(op1.body, expectedBodyParam);
        assert.strictEqual(op1.parameters.length, 2);
        assert.deepStrictEqual(op1.parameters[0], expectedBodyParam);
        assert.strictEqual(op1.parameters[1].name, 'orgId');
      });

      test('should support x-position attributes', () => {
        const ops: ExtendedApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet/{orgId}',
            parameters: [
              {
                name: 'countryId',
                in: 'header',
                required: false,
                schema: {
                  type: 'number',
                },
                'x-position': 4,
              },
              {
                name: 'wild',
                in: 'query',
                schema: {
                  type: 'boolean',
                },
                'x-position': 2,
              },
              {
                name: 'orgId',
                in: 'path',
                required: true,
                schema: {
                  type: 'number',
                },
                'x-position': 1,
              },
            ],
            requestBody: {
              required: true,
              'x-name': 'pet',
              'x-position': 3,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet',
                  },
                },
              },
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, opts);
        const expectedBodyParam = {
          name: 'pet',
          optional: false,
          originalName: 'pet',
          type: 'Pet',
        };

        op1.body.original = undefined;
        assert.strictEqual(op1.body.name, expectedBodyParam.name);
        assert.strictEqual(op1.body.optional, expectedBodyParam.optional);
        assert.strictEqual(op1.body.originalName, expectedBodyParam.originalName);
        assert.strictEqual(op1.body.type, expectedBodyParam.type);
        assert.strictEqual(op1.parameters.length, 4);
        assert.deepStrictEqual(
          op1.parameters.map((p) => p.name),
          ['orgId', 'wild', 'pet', 'countryId']
        );
      });
    });

    describe('requestBody (x-www-form-urlencoded)', () => {
      test('should handle requestBody with ref type', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            requestBody: {
              required: true,
              content: {
                'application/x-www-form-urlencoded': {
                  schema: {
                    $ref: '#/components/schemas/Pet',
                  },
                },
              },
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, opts);
        const expectedBodyParam = {
          contentType: 'urlencoded',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'Pet',
          original: ops[0].requestBody,
        };

        assert.deepStrictEqual(op1.body, expectedBodyParam);
        assert.deepStrictEqual(op1.parameters, [expectedBodyParam]);
      });
    });

    describe('requestBody (application/octet-stream)', () => {
      test('should handle File request body', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            requestBody: {
              required: true,
              content: {
                'application/octet-stream': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, opts);
        const expectedBodyParam = {
          contentType: 'binary',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'File',
          original: ops[0].requestBody,
        };

        assert.deepStrictEqual(op1.body, expectedBodyParam);
        assert.deepStrictEqual(op1.parameters, [expectedBodyParam]);
      });
    });

    describe('requestBody (multipart/form-data)', () => {
      test('should handle form data', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                      },
                      file: {
                        type: 'string',
                        format: 'binary',
                      },
                    },
                  },
                },
              },
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, opts);
        const expectedBodyParam = {
          contentType: 'form-data',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'FormData',
          original: ops[0].requestBody,
        };

        assert.deepStrictEqual(op1.body, expectedBodyParam);
        assert.deepStrictEqual(op1.parameters, [expectedBodyParam]);
      });
    });
  });

  describe('skipDeprecated', () => {
    test('should skip deprecated operations', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPetById',
          method: 'get',
          path: '/pet/{petId}',
          parameters: [],
          responses: {},
          group: null,
        },
        {
          operationId: 'getPetByIdDeprecated',
          method: 'get',
          path: '/pet/byId/{petId}',
          parameters: [],
          responses: {},
          group: null,
          deprecated: true,
        },
      ];

      const opts = getClientOptions({
        skipDeprecated: true,
      });

      const operations = prepareOperations(ops, opts);

      assert.deepStrictEqual(operations.length, 1);
      assert.deepStrictEqual(operations[0].name, 'getPetById');
    });
  });
});

describe('fixDuplicateOperations', () => {
  const testCases = [
    { input: [], expected: [] },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
  ];
  for (const { input, expected } of testCases) {
    test(`should handle ${input} as input`, () => {
      const res = fixDuplicateOperations(input);

      assert.deepStrictEqual(res, expected);
    });
  }

  test('handle list with 1 operation only', () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ];

    const res = fixDuplicateOperations(ops);

    // Basically it should be the same
    assert.deepStrictEqual(res, ops);
  });

  test('handle 2 different operations', () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
      {
        operationId: 'somethingElse',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ];

    const res = fixDuplicateOperations(ops);

    // Basically it should be the same
    assert.deepStrictEqual(res, ops);
  });

  test('handle 2 operations with the same operationId', () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
      {
        operationId: 'getPetById',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ];

    const res = fixDuplicateOperations(ops);

    assert.notStrictEqual(res[1].operationId, res[0].operationId);
  });

  // test('handle 3 operations with complex duplicate scenarios', () => {
  //   const ops: ApiOperation[] = [
  //     {
  //       operationId: 'getPetById',
  //       method: 'get',
  //       path: '/pet/{petId}',
  //       parameters: [],
  //       responses: {},
  //       group: null,
  //     },
  //     {
  //       operationId: 'getPetById',
  //       method: 'post',
  //       path: '/pet/{petId}',
  //       parameters: [],
  //       responses: {},
  //       group: null,
  //     },
  //     {
  //       operationId: 'getPetById1',
  //       method: 'put',
  //       path: '/pet/{petId}',
  //       parameters: [],
  //       responses: {},
  //       group: null,
  //     },
  //   ];

  //   const res = fixDuplicateOperations(ops);

  //   assert.strictEqual(res[0].operationId, 'getPetById');
  //   // Second occurence of getPetById should be renamed to getPetById2
  //   // to not affect already existing getPetById1 operation
  //   assert.strictEqual(res[1].operationId, 'getPetById2');
  //   assert.strictEqual(res[2].operationId, 'getPetById1');
  // });
});

describe('getOperationName', () => {
  const testCases = [
    { input: { opId: 'test', group: null }, expected: 'test' },
    { input: { opId: 'test', group: '' }, expected: 'test' },
    { input: { opId: null, group: 'group' }, expected: '' },
    { input: { opId: '', group: 'group' }, expected: '' },
    { input: { opId: null, group: null }, expected: '' },
    { input: { opId: '', group: '' }, expected: '' },
    {
      input: { opId: 'Test_GetPetStory', group: 'Test' },
      expected: 'getPetStory',
    },
    {
      input: { opId: 'Passport.login', group: 'Test' },
      expected: 'passportLogin',
    },
    {
      input: { opId: 'Passport:login', group: 'Test' },
      expected: 'passportLogin',
    },
  ];

  for (const { input, expected } of testCases) {
    test(`should handle ${JSON.stringify(input)}`, () => {
      const res = getOperationName(input.opId, input.group);

      assert.strictEqual(res, expected);
    });
  }
});

describe('getParamName', () => {
  const testCases = [
    { input: 'test', expected: 'test' },
    { input: 'function', expected: '_function' },
    { input: 'test.test', expected: 'test_test' },
    { input: 'test test', expected: 'testTest' },
    { input: 'test.test.test', expected: 'test_test_test' },
    { input: 'af_UNDERSCORED_NAME', expected: 'afUNDERSCOREDNAME' },
    { input: 'test-test', expected: 'testTest' },
    { input: 'test&test', expected: 'testTest' },
  ];

  for (const { input, expected } of testCases) {
    test(`should handle ${JSON.stringify(input)}`, () => {
      const res = getParamName(input);

      assert.strictEqual(res, expected);
    });
  }
});

describe('getParams', () => {
  test('should not affect parameters if no modifiers are provided', () => {
    const originalParams: OA3.ParameterObject[] = [
      {
        name: 'test1',
        in: 'query',
        required: true,
      },
      {
        name: 'test2',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
        },
      },
    ];
    const opts = getClientOptions({
      modifiers: {},
    });

    const [param1, param2] = getParams(originalParams, opts);

    assert.strictEqual(param1.name, 'test1');
    assert.strictEqual(param1.type, 'unknown');
    assert.strictEqual(param1.optional, false);

    assert.strictEqual(param2.name, 'test2');
    assert.strictEqual(param2.type, 'string');
    assert.strictEqual(param2.optional, true);
  });

  test('should filter out parameters with no name', () => {
    const originalParams: OA3.ParameterObject[] = [
      {
        name: '',
        in: 'query',
        required: true,
      },
      {
        name: null,
        in: 'query',
        required: false,
        schema: {
          type: 'string',
        },
      },
      { name: undefined, in: 'query', required: false, schema: { type: 'string' } },
    ];
    const opts = getClientOptions({
      modifiers: {},
    });

    const paramList = getParams(originalParams, opts);
    assert.strictEqual(paramList.length, 0);
  });

  test('should apply modifiers for parameters', () => {
    const originalParams: OA3.ParameterObject[] = [
      {
        name: 'test1',
        in: 'query',
        required: true,
      },
      {
        name: 'test 2',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'test3',
        in: 'header',
        required: true,
        schema: {
          type: 'number',
        },
      },
    ];
    const opts = getClientOptions({
      modifiers: {
        parameters: {
          test1: 'optional',
          // also supports matching by original name
          'test 2': 'required',
          test3: 'ignore',
        },
      },
    });

    const [param1, param2, param3] = getParams(originalParams, opts);

    assert.strictEqual(param1.name, 'test1');
    assert.strictEqual(param1.type, 'unknown');
    assert.strictEqual(param1.optional, true);

    assert.strictEqual(param2.name, 'test2');
    assert.strictEqual(param2.originalName, 'test 2');
    assert.strictEqual(param2.type, 'string');
    assert.strictEqual(param2.optional, false);

    assert.strictEqual(param3, undefined);
  });

  test('should ignore unrecognized modifiers', () => {
    const originalParams: OA3.ParameterObject[] = [
      {
        name: 'test1',
        in: 'query',
        required: true,
      },
      {
        name: 'test 2',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'test3',
        in: 'header',
        required: true,
        schema: {
          type: 'number',
        },
      },
    ];
    const opts = getClientOptions({
      modifiers: {
        parameters: {
          // matching by filtered name 'test 2' -> 'test2'
          test2: 'required',
          somethingElse: 'ignore',
          'a different name': 'optional',
        },
      },
    });

    const [param1, param2, param3] = getParams(originalParams, opts);

    assert.strictEqual(param1.name, 'test1');
    assert.strictEqual(param1.type, 'unknown');
    assert.strictEqual(param1.optional, false);

    assert.strictEqual(param2.name, 'test2');
    assert.strictEqual(param2.originalName, 'test 2');
    assert.strictEqual(param2.type, 'string');
    assert.strictEqual(param2.optional, false);

    assert.strictEqual(param3.name, 'test3');
    assert.strictEqual(param3.type, 'number');
    assert.strictEqual(param3.optional, false);
  });

  // It's because path parameters are by default required. And changing it
  // will break the API. We want to avoid this.
  test('should ignore parameter adjustments for path parameters', () => {
    const originalParams: OA3.ParameterObject[] = [
      {
        name: 'test',
        schema: {
          type: 'string',
        },
        in: 'path',
        required: true,
      },
    ];
    const opts = getClientOptions({
      modifiers: {
        parameters: {
          test: 'ignore',
        },
      },
    });

    const [param] = getParams(originalParams, opts);

    assert.strictEqual(param.name, 'test');
    assert.strictEqual(param.type, 'string');
    assert.strictEqual(param.optional, false);
  });
});

/**
 * ApiOperation that allows extending with x-attributes
 */
interface ExtendedApiOperation extends Omit<ApiOperation, 'parameters' | 'requestBody'> {
  parameters: (
    | OA3.ReferenceObject
    | (OA3.ParameterObject & { [key: `x-${string}`]: number | string })
  )[];
  requestBody?:
    | OA3.ReferenceObject
    | (OA3.RequestBodyObject & { [key: `x-${string}`]: number | string });
}
