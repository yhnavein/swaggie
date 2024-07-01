import { expect } from 'chai';
import { getOperations } from './operations';
import { loadSpecDocument } from '../utils/documentLoader';
import { getDocument } from '../utils';

describe('getPathOperation', () => {
  it('should handle empty operation list', () => {
    const spec = getDocument();

    const res = getOperations(spec as any);

    expect(res).to.be.ok;
    expect(res.length).to.eq(0);
  });

  it('should handle one operation list', () => {
    const spec = getDocument({
      paths: {
        '/api/heartbeat': {
          get: {
            tags: ['System'],
            operationId: 'ApiHeartbeatGet',
            responses: {
              '200': {
                description: 'Service is available.',
              },
            },
          },
        },
      },
    });

    const res = getOperations(spec as any);

    const validResp = [
      {
        contentTypes: [],
        group: 'System',
        id: 'ApiHeartbeatGet',
        method: 'get',
        parameters: [],
        path: '/api/heartbeat',
        responses: [{ code: '200', description: 'Service is available.' }],
        tags: ['System'],
      },
    ];
    expect(res).to.be.eql(validResp);
  });

  it('should parse operations from spec [PetStore Example]', async () => {
    const path = `${__dirname}/../../test/petstore-v3.yml`;
    const spec = await loadSpecDocument(path);
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
