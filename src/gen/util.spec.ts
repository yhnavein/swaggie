import { groupOperationsByGroupName, isBasicType, escapeReservedWords } from './util';

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

describe('isBasicType', () => {
  it('handles null', () => {
    const res = isBasicType(null);

    expect(res).toBe(false);
  });

  it('handles empty string', () => {
    const res = isBasicType('');

    expect(res).toBe(false);
  });

  it('handles basic type', () => {
    const res = isBasicType('object');

    expect(res).toBe(true);
  });

  it('handles strange basic type', () => {
    const res = isBasicType('number]');

    expect(res).toBe(true);
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
