import { groupOperationsByGroupName } from './util';

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

/*
id: string;
  summary: string;
  description: string;
  method: HttpMethod;
  group: string;
  path: string;
  parameters: ApiOperationParam[];
  responses: ApiOperationResponse[];
  security?: ApiOperationSecurity[];
  accepts: string[];
  contentTypes: string[];
  tags?: string[];
  */
