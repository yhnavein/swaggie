import { resolveSpec } from './spec';
import { getOperations } from './operations';

describe('getPathOperation', () => {
  it('handles empty operation list', () => {
    const spec = {
      swagger: '2.0',
      paths: {},
      definitions: {},
    };

    const res = getOperations(spec as any);

    expect(res).toBeDefined();
    expect(res.length).toBe(0);
  });

  it('handles one operation list', () => {
    const spec = {
      swagger: '2.0',
      paths: {
        '/api/heartbeat': {
          get: {
            tags: ['System'],
            operationId: 'ApiHeartbeatGet',
            produces: ['application/json'],
            responses: {
              '200': {
                description: 'Service is available.',
              },
            },
          },
        },
      },
      definitions: {},
      contentTypes: [],
      accepts: [],
    };

    const res = getOperations(spec as any);

    const validResp = [
      {
        accepts: ['application/json'],
        contentTypes: [],
        group: 'System',
        id: 'ApiHeartbeatGet',
        method: 'get',
        parameters: [],
        path: '/api/heartbeat',
        responses: [{ code: '200', description: 'Service is available.' }],
        security: undefined,
        tags: ['System'],
      },
    ];
    expect(res).toMatchObject(validResp);
  });

  it('handles additional content types', () => {
    const spec = {
      swagger: '2.0',
      paths: {
        '/api/heartbeat': {
          post: {
            tags: ['System'],
            operationId: 'ApiHeartbeatGet',
            produces: ['application/json'],
            consumes: ['application/x-www-form-urlencoded'],
            responses: {
              '200': {
                description: 'Service is available.',
              },
            },
          },
        },
      },
      definitions: {},
      contentTypes: [],
      accepts: [],
    };

    const res = getOperations(spec as any);

    expect(res).toBeDefined();
    expect(res[0].contentTypes).toMatchObject(['application/x-www-form-urlencoded']);
  });

  it('[PerStore Example] should parse operations from spec', async () => {
    const path = `${__dirname}/../../test/petstore.yml`;
    const spec = await resolveSpec(path);
    const operations = getOperations(spec);
    expect(operations).toBeDefined();
    expect(operations.length).toBe(3);

    const listPets = operations.find((op) => op.id === 'listPets');
    expect(listPets).toBeDefined();
    expect(listPets.method).toBe('get');
    expect(listPets.path).toBe('/pets');
    expect(listPets.tags).toBeDefined();
    expect(listPets.tags[0]).toBe('pets');
    expect(listPets.responses).toBeDefined();
    expect(listPets.responses.length).toBe(2);

    const res200 = listPets.responses.find((res) => res.code === '200');
    expect(res200).toBeDefined();
    expect(res200.headers['x-next'].type).toBe('string');
    const resDefault = listPets.responses.find((res) => res.code === 'default');
    expect(resDefault).toBeDefined();
  });
});
