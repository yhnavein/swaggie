import { resolveSpec } from './spec';
import { getOperations } from './operations';

describe('operations', () => {
  it('should parse operations from spec', async () => {
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
