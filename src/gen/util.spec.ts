import {
  groupOperationsByGroupName,
  escapeReservedWords,
  getBestResponse,
} from './util';

describe('groupOperationsByGroupName', () => {
  it('handles null', async () => {
    const def = null;

    const res = groupOperationsByGroupName(def);

    expect(res).toMatchObject({});
  });

  it('handles empty array', async () => {
    const def = [];

    const res = groupOperationsByGroupName(def);

    expect(res).toMatchObject({});
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

    expect(res).toBeDefined();
    expect(res.HealthCheck).toBeDefined();
    expect(res.HealthCheck.length).toBe(1);
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

    expect(res).toBeDefined();
    expect(res.HealthCheck).toBeDefined();
    expect(res.HealthCheck.length).toBe(2);
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

    expect(res).toBeDefined();
    expect(res.HealthCheck).toBeDefined();
    expect(res.HealthCheck.length).toBe(1);
    expect(res.Illness).toBeDefined();
    expect(res.Illness.length).toBe(1);
  });
});

describe('escapeReservedWords', () => {
  it('handles null', () => {
    const res = escapeReservedWords(null);

    expect(res).toBe(null);
  });

  it('handles empty string', () => {
    const res = escapeReservedWords('');

    expect(res).toBe('');
  });

  it('handles safe word', () => {
    const res = escapeReservedWords('Burrito');

    expect(res).toBe('Burrito');
  });

  it('handles reserved word', () => {
    const res = escapeReservedWords('return');

    expect(res).toBe('_return');
  });
});

describe('getBestResponse', () => {
  it('handles no responses', () => {
    const op = {
      responses: [],
    };

    const res = getBestResponse(op as any);

    expect(res).toBe(undefined);
  });

  it('handles one response', () => {
    const op = {
      responses: [{ code: '300' }],
    };

    const res = getBestResponse(op as any);

    expect(res).toMatchObject({ code: '300' });
  });

  it('handles multiple responses', () => {
    const op = {
      responses: [{ code: '404' }, { code: '200' }],
    };

    const res = getBestResponse(op as any);

    expect(res).toMatchObject({ code: '200' });
  });

  // TODO: This one does not make sense at all!
  it('handles response without code (WTF?)', () => {
    const first = { something: '404' };
    const second = { something: '200' };
    const op = {
      responses: [first, second],
    };

    const res = getBestResponse(op as any);

    expect(res).toMatchObject(first);
  });
});
