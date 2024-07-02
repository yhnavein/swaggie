import { expect } from 'chai';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { groupOperationsByGroupName, getBestResponse, prepareOutputFilename } from './util';
import type { ApiOperation } from '../types';

describe('groupOperationsByGroupName', () => {
  const testCases = [
    { input: [], expected: {} },
    { input: null, expected: {} },
    { input: undefined, expected: {} },
  ];
  for (const { input, expected } of testCases) {
    it(`should handle ${input} as input`, async () => {
      const res = groupOperationsByGroupName(input);

      expect(res).to.deep.equal(expected);
    });
  }

  it('handles single operation', async () => {
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

    expect(res).to.be.ok;
    expect(res.HealthCheck).to.be.ok;
    expect(res.HealthCheck.length).to.eq(1);
  });

  it('handles two different operations and the same group', async () => {
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

    expect(res).to.be.ok;
    expect(res.HealthCheck).to.be.ok;
    expect(res.HealthCheck.length).to.eq(2);
  });

  it('handles two different operations and different groups', async () => {
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

    expect(res).to.be.ok;
    expect(res.HealthCheck).to.be.ok;
    expect(res.HealthCheck.length).to.eq(1);
    expect(res.Illness).to.be.ok;
    expect(res.Illness.length).to.eq(1);
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
    it(`handles "${given}" correctly`, () => {
      const res = prepareOutputFilename(given);

      expect(res).to.be.equal(expected);
    });
  }
});

describe('getBestResponse', () => {
  it('handles no responses', () => {
    const op: OA3.OperationObject = {
      responses: {},
    };

    const res = getBestResponse(op);

    expect(res).to.be.equal(null);
  });

  it('handles 200 response with text/plain media type', () => {
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

    const res = getBestResponse(op);

    expect(res).to.be.eql({
      schema: {
        $ref: '#/components/schemas/TestObject',
      },
    });
  });

  it('handles 201 response with unsupported media type', () => {
    const op: OA3.OperationObject = {
      responses: {
        '201': {
          description: 'Success',
          content: {
            'application/octet-stream': {
              schema: {
                $ref: '#/components/schemas/TestObject',
              },
            },
          },
        },
      },
    };

    const res = getBestResponse(op);

    expect(res).to.be.eql(null);
  });

  it('handles multiple responses', () => {
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

    const res = getBestResponse(op);

    expect(res).to.be.eql({
      schema: {
        $ref: '#/components/schemas/TestObject',
      },
    });
  });
});
