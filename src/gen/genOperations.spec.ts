import { test, describe, expect, beforeAll } from 'bun:test';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateOperations, {
  prepareOperations,
  fixDuplicateOperations,
  generateHooks,
  getOperationName,
  getParamName,
  getParams,
  prefixApiType,
  toOpName,
} from './genOperations';
import type { ApiOperation } from '../types';
import { getClientOptions, getDocument } from '../../test/test.utils';
import { IBodyParam, PositionedParameter } from './types';
import { loadAllTemplateFiles } from '../utils';
import { normalizeTemplate } from '../utils/templateValidator';

describe('prepareOperations', () => {
  const opts = getClientOptions();

  describe('parameters', () => {
    test('should throw a helpful error for invalid properties.$ref schema shape', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'GetGenericResource',
          method: 'get',
          path: '/resources/{resourceId}',
          parameters: [
            {
              name: 'resourceId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      $ref: '#/components/schemas/GenericResource',
                    } as unknown as OA3.SchemaObject['properties'],
                  },
                },
              },
            },
          },
          group: null,
        },
      ];

      expect(() => prepareOperations(ops, opts)).toThrow(
        'Failed to prepare operation GET /resources/{resourceId} (GetGenericResource). Check if schema is valid for this operation.'
      );
    });

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

      const headerParam = res.headers.pop()!;
      expect(headerParam.name).toBe('orgID');
      expect(headerParam.originalName).toBe('Org-ID');
      expect(headerParam.type).toBe('string');
      expect(headerParam.optional).toBe(false);

      const queryParam = res.query.pop()!;
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

    test('should group query params into object at the first query param position', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPets',
          method: 'get',
          path: '/pets/{orgId}',
          parameters: [
            {
              name: 'countryId',
              in: 'header',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'search',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'orgId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'page',
              in: 'query',
              required: true,
              schema: { type: 'number' },
            },
          ],
          responses: {},
          group: null,
        },
      ];

      const [op] = prepareOperations(ops, {
        ...opts,
        queryParamsSerialization: {
          ...opts.queryParamsSerialization,
          queryParamsAsObject: true,
        },
      });

      expect(op.parameters.map((p) => p.name)).toEqual(['countryId', 'queryParams', 'orgId']);
      expect(op.query.map((p) => p.name)).toEqual(['search', 'page']);
      expect(op.queryParamObject?.name).toBe('queryParams');
      expect(op.queryParamObject?.optional).toBe(false);
      expect(op.queryParamObject?.type).toContain('search?: string | null;');
      expect(op.queryParamObject?.type).toContain('page: number;');
    });

    test('should keep grouped query object at the lowest query x-position', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPets',
          method: 'get',
          path: '/pets/{orgId}',
          parameters: [
            {
              name: 'headerValue',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              'x-position': 4,
            } as PositionedParameter,
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'number' },
              'x-position': 2,
            } as PositionedParameter,
            {
              name: 'orgId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              'x-position': 1,
            } as PositionedParameter,
            {
              name: 'search',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              'x-position': 3,
            } as PositionedParameter,
          ],
          responses: {},
          group: null,
        },
      ];

      const [op] = prepareOperations(ops, {
        ...opts,
        queryParamsSerialization: {
          ...opts.queryParamsSerialization,
          queryParamsAsObject: true,
        },
      });

      expect(op.parameters.map((p) => p.name)).toEqual(['orgId', 'queryParams', 'headerValue']);
    });

    test('should group query params only when count is greater than threshold', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPets',
          method: 'get',
          path: '/pets',
          parameters: [
            {
              name: 'search',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'number' },
            },
          ],
          responses: {},
          group: null,
        },
      ];

      const [withoutGrouping] = prepareOperations(ops, {
        ...opts,
        queryParamsSerialization: {
          ...opts.queryParamsSerialization,
          queryParamsAsObject: 2,
        },
      });

      expect(withoutGrouping.queryParamObject).toBeUndefined();
      expect(withoutGrouping.parameters.map((p) => p.name)).toEqual(['search', 'page']);

      const [withGrouping] = prepareOperations(ops, {
        ...opts,
        queryParamsSerialization: {
          ...opts.queryParamsSerialization,
          queryParamsAsObject: 1,
        },
      });

      expect(withGrouping.queryParamObject?.name).toBe('queryParams');
      expect(withGrouping.parameters.map((p) => p.name)).toEqual(['queryParams']);
    });

    describe('requestBody (JSON)', () => {
      const fetchOpts = getClientOptions({ template: 'fetch' });

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

        const [op1] = prepareOperations(ops, fetchOpts);
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
        expect(op1.headers).toEqual([
          {
            originalName: 'Content-Type',
            value: 'application/json',
          },
        ]);
      });

      test('should upsert existing Content-Type header when body is json', () => {
        const ops: ApiOperation[] = [
          {
            operationId: 'createPet',
            method: 'post',
            path: '/pet',
            parameters: [
              {
                name: 'Content-Type',
                in: 'header',
                required: false,
                schema: {
                  type: 'string',
                },
              },
            ],
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

        const [op1] = prepareOperations(ops, fetchOpts);

        expect(op1.headers).toHaveLength(1);
        expect(op1.headers[0]).toEqual(
          expect.objectContaining({
            originalName: 'Content-Type',
            name: 'contentType',
            type: 'string',
            optional: true,
            value: 'application/json',
          })
        );
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

      test('should not inject Content-Type for json when template is not fetch', () => {
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
        expect(op1.headers).toEqual([]);
      });

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
        expect(op1.body!.type).toBe('number[] | null');
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

        op1.body!.original = undefined;
        expect(op1.body!.name).toBe(expectedBodyParam.name);
        expect(op1.body!.optional).toBe(expectedBodyParam.optional);
        expect(op1.body!.originalName).toBe(expectedBodyParam.originalName);
        expect(op1.body!.type).toBe(expectedBodyParam.type);
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
        expect(op1.body!.type).toBe('Pet');
        expect(op1.body!.optional).toBe(false);
        expect(op1.body!.contentType).toBe('json');
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
        expect(op1.headers).toEqual([
          {
            originalName: 'Content-Type',
            value: 'application/x-www-form-urlencoded',
          },
        ]);
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
        expect(op1.headers).toEqual([]);
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
        expect(op1.headers).toEqual([]);
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
    { input: null, expected: [] },
    { input: undefined, expected: [] },
  ];
  for (const { input, expected } of testCases) {
    test(`should handle ${input} as input`, () => {
      const res = fixDuplicateOperations(input as ApiOperation[]);

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
        name: null as unknown as string,
        in: 'query',
        required: false,
        schema: {
          type: 'string',
        },
      },
      {
        name: undefined as unknown as string,
        in: 'query',
        required: false,
        schema: { type: 'string' },
      },
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

describe('prefixApiType', () => {
  test('prefixes a bare named type', () => {
    expect(prefixApiType('Pet')).toBe('API.Pet');
  });

  test('prefixes an array of a named type', () => {
    expect(prefixApiType('Pet[]')).toBe('API.Pet[]');
  });

  test('prefixes named types in a union', () => {
    expect(prefixApiType('Pet | Order')).toBe('API.Pet | API.Order');
  });

  test('prefixes a named type in a nullable union', () => {
    expect(prefixApiType('Pet | null')).toBe('API.Pet | null');
  });

  test('leaves primitive types unprefixed', () => {
    expect(prefixApiType('unknown')).toBe('unknown');
    expect(prefixApiType('string')).toBe('string');
    expect(prefixApiType('number')).toBe('number');
    expect(prefixApiType('boolean')).toBe('boolean');
    expect(prefixApiType('Date')).toBe('Date');
    expect(prefixApiType('Record<string, number>')).toBe('Record<string, number>');
  });

  test('prefixes named type values inside an inline object type', () => {
    expect(prefixApiType('{ profile: MyEnum; }')).toBe('{ profile: API.MyEnum; }');
  });

  test('prefixes multiple named types inside an inline object type', () => {
    const input = '{ aggregationProfile: ChargeAggregationProfileSlugV5; window: ConsumptionWindowV5; }';
    const expected = '{ aggregationProfile: API.ChargeAggregationProfileSlugV5; window: API.ConsumptionWindowV5; }';
    expect(prefixApiType(input)).toBe(expected);
  });

  test('leaves primitive property value types inside an inline object unprefixed', () => {
    expect(prefixApiType('{ id: number; name: string; active: boolean; }')).toBe(
      '{ id: number; name: string; active: boolean; }'
    );
  });

  test('mixes named and primitive types inside an inline object', () => {
    const input = '{ id: number; status: OrderStatus; label: string; }';
    const expected = '{ id: number; status: API.OrderStatus; label: string; }';
    expect(prefixApiType(input)).toBe(expected);
  });

  test('does not double-prefix already-namespaced types', () => {
    expect(prefixApiType('API.Pet')).toBe('API.Pet');
    expect(prefixApiType('API.Pet[]')).toBe('API.Pet[]');
  });

  test('handles empty and falsy input', () => {
    expect(prefixApiType('')).toBe('');
  });

  test('leaves Web API globals unprefixed', () => {
    expect(prefixApiType('FormData')).toBe('FormData');
    expect(prefixApiType('File')).toBe('File');
    expect(prefixApiType('Blob')).toBe('Blob');
    expect(prefixApiType('URLSearchParams')).toBe('URLSearchParams');
    expect(prefixApiType('ArrayBuffer')).toBe('ArrayBuffer');
  });

  test('does not prefix double-quoted string literal enum values', () => {
    expect(prefixApiType('"AZURE" | "AWS" | "GCP"')).toBe('"AZURE" | "AWS" | "GCP"');
  });

  test('does not prefix single-quoted string literal enum values', () => {
    expect(prefixApiType("'search' | 'compute'")).toBe("'search' | 'compute'");
  });

  test('does not prefix quoted enum values inside an inline object type', () => {
    const input = '{ provider?: "AZURE" | "AWS" | "GCP" | null; region?: string | null; }';
    expect(prefixApiType(input)).toBe(input);
  });

  test('prefixes named types but leaves quoted string literals untouched in a mixed union', () => {
    expect(prefixApiType('"available" | Pet')).toBe('"available" | API.Pet');
  });

  test('prefixes named types but leaves quoted string literals untouched inside a generic', () => {
    expect(prefixApiType('Record<"asc" | "desc", Pet>')).toBe('Record<"asc" | "desc", API.Pet>');
  });
});

describe('toOpName', () => {
  test('strips leading get prefix (case-insensitive)', () => {
    expect(toOpName('getPetById')).toBe('PetById');
    expect(toOpName('GetPetById')).toBe('PetById');
  });

  test('does not strip get from non-get prefix', () => {
    expect(toOpName('generateReport')).toBe('GenerateReport');
    expect(toOpName('getaway')).toBe('Away');
  });

  test('capitalises the first letter for non-get operations', () => {
    expect(toOpName('createPet')).toBe('CreatePet');
    expect(toOpName('deletePet')).toBe('DeletePet');
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

// ─── hooksCamelCaseName: reserved-word guard for hooks exports ────────────────

/**
 * A minimal spec where no operation has tags. The group name falls back to
 * 'default', which is a JS reserved word and must not appear as
 * `export const default = {}` in reactive hooks output.
 */
const NO_TAGS_SPEC = getDocument({
  paths: {
    '/health': {
      get: {
        operationId: 'getHealth',
        responses: {
          '200': { description: 'ok' },
        },
      },
      post: {
        operationId: 'createHealth',
        responses: {
          '201': { description: 'created' },
        },
      },
    },
  },
});

// ─── SWR mutation HTML-escaping regression ───────────────────────────────────

/**
 * A spec with a POST mutation that has a query parameter whose type is a
 * string-literal enum (e.g. `"search"`). The generated SWR mutation must emit
 * the raw `"search"` in the `{ arg }` destructuring annotation, not the
 * HTML-escaped `&quot;search&quot;`.
 */
const STRING_LITERAL_PARAM_SPEC = getDocument({
  paths: {
    '/deployments/{name}/operations': {
      post: {
        operationId: 'operateDeployment',
        tags: ['deployments'],
        parameters: [
          {
            name: 'type',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['search', 'compute'] },
          },
          {
            name: 'name',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { type: 'object' } },
          },
        },
        responses: {
          '200': { description: 'ok' },
        },
      },
    },
  },
});

describe('SWR mutation — no HTML escaping in arg destructuring type', () => {
  beforeAll(() => {
    loadAllTemplateFiles(normalizeTemplate(['swr', 'xior'] as any));
  });

  test('single-file swr: string-literal param types are not HTML-escaped in arg type annotation', async () => {
    const opts = getClientOptions({ template: normalizeTemplate(['swr', 'xior'] as any) as any });
    const output = await generateOperations(STRING_LITERAL_PARAM_SPEC, opts);

    // The raw double-quote must appear in the generated code
    expect(output).toContain('"search"');
    expect(output).toContain('"compute"');
    // The HTML-escaped form must never appear
    expect(output).not.toContain('&quot;');
  });

  test('split-file swr: string-literal param types are not HTML-escaped in arg type annotation', async () => {
    const opts = getClientOptions({
      template: normalizeTemplate(['swr', 'xior'] as any) as any,
      hooksOut: './.tmp/test/hooks-html-escape-test.ts',
    });
    const hooksOutput = await generateHooks(STRING_LITERAL_PARAM_SPEC, opts, './api');

    expect(hooksOutput).toContain('"search"');
    expect(hooksOutput).toContain('"compute"');
    expect(hooksOutput).not.toContain('&quot;');
  });
});

describe('hooksCamelCaseName — reserved-word guard', () => {
  beforeAll(() => {
    loadAllTemplateFiles(normalizeTemplate(['tsq', 'xior'] as any));
  });

  test('single-file tsq: emits `export const main` and references `main.queryKeys` inside hook body', async () => {
    const opts = getClientOptions({ template: normalizeTemplate(['tsq', 'xior'] as any) as any });
    const output = await generateOperations(NO_TAGS_SPEC, opts);

    // The HTTP client export must still use 'default' (i.e. defaultClient)
    expect(output).toContain('export const defaultClient');
    // The hooks namespace must NOT use the reserved word 'default'
    expect(output).not.toContain('export const default ');
    // It must use 'main' for the namespace export
    expect(output).toContain('export const main =');
    // The queryKeys reference inside the hook body must also use 'main', not 'default'
    expect(output).toContain('main.queryKeys.');
    expect(output).not.toContain('default.queryKeys.');
    // The HTTP client call inside the hook body must still call 'defaultClient'
    expect(output).toContain('defaultClient.');
  });

  test('split-file tsq: hooks file emits `export const main` and references `main.queryKeys` inside hook body', async () => {
    const opts = getClientOptions({
      template: normalizeTemplate(['tsq', 'xior'] as any) as any,
      hooksOut: './.tmp/test/hooks-default-test.ts',
    });
    const hooksOutput = await generateHooks(NO_TAGS_SPEC, opts, './api');

    expect(hooksOutput).not.toContain('export const default ');
    expect(hooksOutput).toContain('export const main =');
    // queryKeys reference inside the hook body must also use 'main'
    expect(hooksOutput).toContain('main.queryKeys.');
    expect(hooksOutput).not.toContain('default.queryKeys.');
    // The HTTP client is accessed via the API namespace import, not 'mainClient'
    expect(hooksOutput).toContain('API.defaultClient.');
    expect(hooksOutput).not.toContain('API.mainClient.');
  });
});
