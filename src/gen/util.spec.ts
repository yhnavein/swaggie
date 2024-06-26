import { expect } from 'chai';
import { groupOperationsByGroupName, getBestResponse, prepareOutputFilename } from './util';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

describe('groupOperationsByGroupName', () => {
  it('handles null', async () => {
    const def = null;

    const res = groupOperationsByGroupName(def);

    expect(res).to.be.eql({});
  });

  it('handles empty array', async () => {
    const def = [];

    const res = groupOperationsByGroupName(def);

    expect(res).to.be.eql({});
  });

  it('handles single operation', async () => {
    const def = [
      {
        consumes: [],
        id: 'HealthCheck_PerformAllChecks',
        method: 'GET',
        group: 'HealthCheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            type: 'string',
          },
        ],
        produces: [],
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
    const def = [
      {
        consumes: [],
        id: 'HealthCheck_PerformAllChecks',
        method: 'GET',
        group: 'HealthCheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            type: 'string',
          },
        ],
        produces: [],
        responses: {
          '200': {
            description: 'Success',
          },
        },
        tags: ['HealthCheck'],
      },
      {
        consumes: [],
        id: 'HealthCheck_SomethingElse',
        method: 'GET',
        group: 'HealthCheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            type: 'string',
          },
        ],
        produces: [],
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
    const def = [
      {
        consumes: [],
        id: 'HealthCheck_PerformAllChecks',
        method: 'GET',
        group: 'HealthCheck',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            type: 'string',
          },
        ],
        produces: [],
        responses: {
          '200': {
            description: 'Success',
          },
        },
        tags: ['HealthCheck'],
      },
      {
        consumes: [],
        id: 'Illness_SomethingElse',
        method: 'GET',
        group: 'Illness',
        parameters: [
          {
            in: 'query',
            name: 'token',
            required: false,
            type: 'string',
          },
        ],
        produces: [],
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
