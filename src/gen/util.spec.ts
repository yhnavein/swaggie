import { expect } from 'chai';
import { groupOperationsByGroupName, getBestResponse, prepareOutputFilename } from './util';

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
  [
    { given: null, expected: null },
    { given: 'api.ts', expected: 'api.ts' },
    { given: 'api', expected: 'api.ts' },
    { given: 'api/', expected: 'api/index.ts' },
    { given: 'api\\', expected: 'api/index.ts' },
    { given: 'api/api.ts', expected: 'api/api.ts' },
    { given: 'api//api.ts', expected: 'api//api.ts' },
    { given: 'api\\api.ts', expected: 'api/api.ts' },
    { given: 'api/api/', expected: 'api/api/index.ts' },
  ].forEach((el) => {
    it(`handles ${el.given}`, () => {
      const res = prepareOutputFilename(el.given);

      expect(res).to.be.equal(el.expected);
    });
  });
});

describe('getBestResponse', () => {
  it('handles no responses', () => {
    const op = {
      responses: [],
    };

    const res = getBestResponse(op as any);

    expect(res).to.be.equal(undefined);
  });

  it('handles one response', () => {
    const op = {
      responses: [{ code: '300' }],
    };

    const res = getBestResponse(op as any);

    expect(res).to.be.eql({ code: '300' });
  });

  it('handles multiple responses', () => {
    const op = {
      responses: [{ code: '404' }, { code: '200' }],
    };

    const res = getBestResponse(op as any);

    expect(res).to.be.eql({ code: '200' });
  });

  // TODO: This one does not make sense at all!
  it('handles response without code (WTF?)', () => {
    const first = { something: '404' };
    const second = { something: '200' };
    const op = {
      responses: [first, second],
    };

    const res = getBestResponse(op as any);

    expect(res).to.be.eql(first);
  });
});
