import { expect } from 'chai';
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
    it('should prepare parameter types for use in templates', () => {
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

      expect(res.name).to.equal('getPetById');
      expect(res.method).to.equal('GET');
      expect(res.body).to.be.null;
      expect(res.returnType).to.equal('unknown');

      expect(res.headers.pop()).to.deep.include({
        name: 'orgID',
        originalName: 'Org-ID',
        type: 'string',
        optional: false,
      });

      expect(res.query.pop()).to.deep.include({
        name: 'orgType',
        originalName: 'OrgType',
        type: 'string',
        optional: true,
      });

      expect(res.parameters.length).to.equal(3);
      expect(res.parameters.map((p) => p.name)).to.deep.equal(['orgID', 'orgType', 'petId']);
      expect(res.parameters.map((p) => p.skippable ?? false)).to.deep.equal([false, true, true]);
    });

    it('should handle empty parameters', () => {
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

      expect(op1.parameters).to.deep.equal([]);
      expect(op2.parameters).to.deep.equal([]);
    });

    it('should prepare URL correctly', () => {
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

      expect(op1.url).to.equal('/pet/${encodeURIComponent(`${petId}`)}');
      expect(op2.url).to.equal('/users/${encodeURIComponent(`${userId}`)}/Wrong{/Path}');
      expect(op3.url).to.equal('/users/{}/Wrong{');
    });

    it('should not mark parameters as skippable if there is required parameter after them', () => {
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

      expect(parameters.length).to.equal(4);
      expect(parameters.map((p) => p.skippable ?? false)).to.deep.equal([
        false,
        false,
        false,
        true,
      ]);
    });

    describe('requestBody (JSON)', () => {
      it('should handle requestBody with ref type', () => {
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

        expect(op1.body).to.deep.equal(expectedBodyParam);
        expect(op1.parameters).to.deep.equal([expectedBodyParam]);
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
        it(`should handle requestBody with ${schema} schema`, () => {
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

          expect(op1.body).to.deep.equal(expectedBodyParam);
          expect(op1.parameters).to.deep.equal([expectedBodyParam]);
        });
      }

      it('should handle requestBody along with other parameters', () => {
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

        expect(op1.body).to.deep.equal(expectedBodyParam);
        expect(op1.parameters.length).to.equal(2);
        expect(op1.parameters[0]).to.deep.equal(expectedBodyParam);
        expect(op1.parameters[1].name).to.equal('orgId');
      });

      it('should support x-position attributes', () => {
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
        expect(op1.body).to.deep.contain(expectedBodyParam);
        expect(op1.parameters.length).to.equal(4);
        expect(op1.parameters.map((p) => p.name)).to.deep.equal([
          'orgId',
          'wild',
          'pet',
          'countryId',
        ]);
      });
    });

    describe('requestBody (x-www-form-urlencoded)', () => {
      it('should handle requestBody with ref type', () => {
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

        expect(op1.body).to.deep.equal(expectedBodyParam);
        expect(op1.parameters).to.deep.equal([expectedBodyParam]);
      });
    });

    describe('requestBody (application/octet-stream)', () => {
      it('should handle File request body', () => {
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

        expect(op1.body).to.deep.equal(expectedBodyParam);
        expect(op1.parameters).to.deep.equal([expectedBodyParam]);
      });
    });

    describe('requestBody (multipart/form-data)', () => {
      it('should handle form data', () => {
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

        expect(op1.body).to.deep.equal(expectedBodyParam);
        expect(op1.parameters).to.deep.equal([expectedBodyParam]);
      });
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
    it(`should handle ${input} as input`, () => {
      const res = fixDuplicateOperations(input);

      expect(res).to.deep.eq(expected);
    });
  }

  it('handle list with 1 operation only', () => {
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
    expect(res).to.be.deep.equal(ops);
  });

  it('handle 2 different operations', () => {
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
    expect(res).to.be.deep.equal(ops);
  });

  it('handle 2 operations with the same operationId', () => {
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

    expect(res[1].operationId).not.to.be.equal(res[0].operationId);
  });

  // TODO: If someone wants to adjust code to fix this issue, then please go ahead :)
  /*
  it(`handle 3 operations with the same operationId even after fix`, () => {
    const ops = [
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
      {
        operationId: 'getPetById1',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ] as ApiOperation[];

    const res = fixDuplicateOperations(ops);

    console.log('Ops', ops.map(e => e.operationId));
    console.log('Res', res.map(e => e.operationId));

    expect(res[0].operationId).not.to.be.equal(res[1].operationId);
    expect(res[1].operationId).not.to.be.equal(res[2].operationId);
  });
*/
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
    it(`should handle ${JSON.stringify(input)}`, () => {
      const res = getOperationName(input.opId, input.group);

      expect(res).to.be.equal(expected);
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
  ];

  for (const { input, expected } of testCases) {
    it(`should handle ${JSON.stringify(input)}`, () => {
      const res = getParamName(input);

      expect(res).to.be.equal(expected);
    });
  }
});

describe('getParams', () => {
  it('should not affect parameters if no modifiers are provided', () => {
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

    expect(param1).to.deep.include({
      name: 'test1',
      type: 'unknown',
      optional: false,
    });

    expect(param2).to.deep.include({
      name: 'test2',
      type: 'string',
      optional: true,
    });
  });

  it('should apply modifiers for parameters', () => {
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

    expect(param1).to.deep.include({
      name: 'test1',
      type: 'unknown',
      optional: true,
    });

    expect(param2).to.deep.include({
      name: 'test2',
      originalName: 'test 2',
      type: 'string',
      optional: false,
    });

    expect(param3).to.be.undefined;
  });

  it('should ignore unrecognized modifiers', () => {
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

    expect(param1).to.deep.include({
      name: 'test1',
      type: 'unknown',
      optional: false,
    });

    expect(param2).to.deep.include({
      name: 'test2',
      originalName: 'test 2',
      type: 'string',
      optional: false,
    });

    expect(param3).to.deep.include({
      name: 'test3',
      type: 'number',
      optional: false,
    });
  });

  // It's because path parameters are by default required. And changing it
  // will break the API. We want to avoid this.
  it('should ignore parameter adjustments for path parameters', () => {
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

    expect(param).to.deep.include({
      name: 'test',
      type: 'string',
      optional: false,
    });
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
