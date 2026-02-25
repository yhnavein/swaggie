import { test, describe, expect } from 'bun:test';
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
import { IBodyParam } from './types';

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

      expect(res.name).toBe('getPetById');
      expect(res.method).toBe('GET');
      expect(res.body).toBeNull();
      expect(res.returnType).toBe('unknown');

      const headerParam = res.headers.pop();
      expect(headerParam.name).toBe('orgID');
      expect(headerParam.originalName).toBe('Org-ID');
      expect(headerParam.type).toBe('string');
      expect(headerParam.optional).toBe(false);

      const queryParam = res.query.pop();
      expect(queryParam.name).toBe('orgType');
      expect(queryParam.originalName).toBe('OrgType');
      expect(queryParam.type).toBe('string');
      expect(queryParam.optional).toBe(true);

      expect(res.parameters.length).toBe(3);
      expect(res.parameters.map((p) => p.name)).toEqual(['orgID', 'orgType', 'petId']);
      expect(res.parameters.map((p) => p.skippable ?? false)).toEqual([false, true, true]);
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

      expect(parameters.map((p) => p.name)).toEqual(['_url', '_config', '_axios', '_http']);
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

      expect(op1.parameters).toEqual([]);
      expect(op2.parameters).toEqual([]);
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

      expect(op1.url).toBe('/pet/${encodeURIComponent(`${petId}`)}');
      expect(op2.url).toBe('/users/${encodeURIComponent(`${userId}`)}/Wrong{/Path}');
      expect(op3.url).toBe('/users/{}/Wrong{');
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

      expect(parameters.length).toBe(4);
      expect(parameters.map((p) => p.skippable ?? false)).toEqual([false, false, false, true]);
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
        const expectedBodyParam: IBodyParam = {
          contentType: 'json',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'Pet',
          original: ops[0].requestBody as OA3.RequestBodyObject,
        };

        expect(op1.body).toEqual(expectedBodyParam);
        expect(op1.parameters).toEqual([expectedBodyParam]);
      });

      type TestCase = {
        schema: OA3.SchemaObject;
        expectedType: string;
      };

      const testCases: TestCase[] = [
        { schema: { type: 'string' }, expectedType: 'string' },
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
          const expectedBodyParam: IBodyParam = {
            contentType: 'json',
            name: 'body',
            optional: true,
            skippable: true,
            originalName: 'body',
            type: expectedType,
            original: ops[0].requestBody as OA3.RequestBodyObject,
          };

          expect(op1.body).toEqual(expectedBodyParam);
          expect(op1.parameters).toEqual([expectedBodyParam]);
        });
      }

      test('should handle nullable requestBody schema with nullableStrategy: include', () => {
        const includeOpts = getClientOptions({ nullableStrategy: 'include' });
        const nullableSchema: OA3.SchemaObject = {
          items: { format: 'int64', type: 'integer' },
          nullable: true,
          type: 'array',
        };
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            requestBody: {
              content: { 'application/json': { schema: nullableSchema } },
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, includeOpts);
        expect(op1.body.type).toBe('number[] | null');
      });

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
        const expectedBodyParam: IBodyParam = {
          contentType: 'json',
          name: 'petBody',
          optional: false,
          originalName: 'pet-body',
          type: 'Pet',
          original: ops[0].requestBody as OA3.RequestBodyObject,
        };

        expect(op1.body).toEqual(expectedBodyParam);
        expect(op1.parameters.length).toBe(2);
        expect(op1.parameters[0]).toEqual(expectedBodyParam);
        expect(op1.parameters[1].name).toBe('orgId');
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
        const expectedBodyParam: IBodyParam = {
          name: 'pet',
          optional: false,
          originalName: 'pet',
          type: 'Pet',
        };

        op1.body.original = undefined;
        expect(op1.body.name).toBe(expectedBodyParam.name);
        expect(op1.body.optional).toBe(expectedBodyParam.optional);
        expect(op1.body.originalName).toBe(expectedBodyParam.originalName);
        expect(op1.body.type).toBe(expectedBodyParam.type);
        expect(op1.parameters.length).toBe(4);
        expect(op1.parameters.map((p) => p.name)).toEqual(['orgId', 'wild', 'pet', 'countryId']);
      });
    });

    describe('requestBody ($ref)', () => {
      test('should resolve requestBody $ref from components/requestBodies', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            requestBody: {
              $ref: '#/components/requestBodies/PetBody',
            },
            responses: {},
            group: null,
          },
        ];
        const components: OA3.ComponentsObject = {
          requestBodies: {
            PetBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' },
                },
              },
            },
          },
        };

        const [op1] = prepareOperations(ops, opts, components);

        expect(op1.body).not.toBeNull();
        expect(op1.body.type).toBe('Pet');
        expect(op1.body.optional).toBe(false);
        expect(op1.body.contentType).toBe('json');
      });

      test('should return null body when requestBody $ref is not found in components', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            requestBody: {
              $ref: '#/components/requestBodies/MissingBody',
            },
            responses: {},
            group: null,
          },
        ];

        const [op1] = prepareOperations(ops, opts, {});

        expect(op1.body).toBeNull();
      });

      test('should resolve returnType from a $ref response via components', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'getPets',
            method: 'get',
            path: '/pets',
            parameters: [],
            responses: {
              '200': {
                $ref: '#/components/responses/PetsResponse',
              },
            },
            group: null,
          },
        ];
        const components: OA3.ComponentsObject = {
          responses: {
            PetsResponse: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' },
                },
              },
            },
          },
        };

        const [op1] = prepareOperations(ops, opts, components);

        expect(op1.returnType).toBe('Pet');
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
        const expectedBodyParam: IBodyParam = {
          contentType: 'urlencoded',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'Pet',
          original: ops[0].requestBody as OA3.RequestBodyObject,
        };

        expect(op1.body).toEqual(expectedBodyParam);
        expect(op1.parameters).toEqual([expectedBodyParam]);
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
        const expectedBodyParam: IBodyParam = {
          contentType: 'binary',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'File',
          original: ops[0].requestBody as OA3.RequestBodyObject,
        };

        expect(op1.body).toEqual(expectedBodyParam);
        expect(op1.parameters).toEqual([expectedBodyParam]);
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
        const expectedBodyParam: IBodyParam = {
          contentType: 'form-data',
          name: 'body',
          optional: false,
          originalName: 'body',
          type: 'FormData',
          original: ops[0].requestBody as OA3.RequestBodyObject,
        };

        expect(op1.body).toEqual(expectedBodyParam);
        expect(op1.parameters).toEqual([expectedBodyParam]);
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

      expect(operations.length).toBe(1);
      expect(operations[0].name).toBe('getPetById');
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

      expect(res).toEqual(expected);
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
    expect(res).toEqual(ops);
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
    expect(res).toEqual(ops);
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

    expect(res[1].operationId).not.toBe(res[0].operationId);
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

      expect(res).toBe(expected);
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

      expect(res).toBe(expected);
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

    expect(param1.name).toBe('test1');
    expect(param1.type).toBe('unknown');
    expect(param1.optional).toBe(false);

    expect(param2.name).toBe('test2');
    expect(param2.type).toBe('string');
    expect(param2.optional).toBe(true);
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
    expect(paramList.length).toBe(0);
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

    expect(param1.name).toBe('test1');
    expect(param1.type).toBe('unknown');
    expect(param1.optional).toBe(true);

    expect(param2.name).toBe('test2');
    expect(param2.originalName).toBe('test 2');
    expect(param2.type).toBe('string');
    expect(param2.optional).toBe(false);

    expect(param3).toBeUndefined();
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

    expect(param1.name).toBe('test1');
    expect(param1.type).toBe('unknown');
    expect(param1.optional).toBe(false);

    expect(param2.name).toBe('test2');
    expect(param2.originalName).toBe('test 2');
    expect(param2.type).toBe('string');
    expect(param2.optional).toBe(false);

    expect(param3.name).toBe('test3');
    expect(param3.type).toBe('number');
    expect(param3.optional).toBe(false);
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

    expect(param.name).toBe('test');
    expect(param.type).toBe('string');
    expect(param.optional).toBe(false);
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
