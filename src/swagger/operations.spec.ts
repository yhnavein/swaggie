import { expect } from 'chai';
import { resolveSpec } from './swagger';
import { getOperations } from './operations';

describe('getPathOperation', () => {
  it('handles empty operation list', () => {
    const spec = {
      swagger: '2.0',
      paths: {},
      definitions: {},
    };

    const res = getOperations(spec as any);

    expect(res).to.be.ok;
    expect(res.length).to.eq(0);
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
    expect(res).to.be.eql(validResp);
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

    expect(res).to.be.ok;
    expect(res[0].contentTypes).to.be.eql(['application/x-www-form-urlencoded']);
  });

  it('[PerStore Example] should parse operations from spec', async () => {
    const path = `${__dirname}/../../test/petstore.yml`;
    const spec = await resolveSpec(path);
    const operations = getOperations(spec);
    expect(operations).to.be.ok;
    expect(operations.length).to.eq(3);

    const listPets = operations.find((op) => op.id === 'listPets');
    expect(listPets).to.be.ok;
    expect(listPets?.method).to.be.equal('get');
    expect(listPets?.path).to.be.equal('/pets');
    expect(listPets?.tags).to.be.ok;
    expect(listPets?.tags?.[0]).to.be.equal('pets');
    expect(listPets?.responses).to.be.ok;
    expect(listPets?.responses.length).to.eq(2);

    const res200 = listPets?.responses.find((res) => res.code === '200');
    expect(res200).to.be.ok;
    expect(res200?.headers['x-next'].type).to.be.equal('string');
    const resDefault = listPets?.responses.find((res) => res.code === 'default');
    expect(resDefault).to.be.ok;
  });
});
