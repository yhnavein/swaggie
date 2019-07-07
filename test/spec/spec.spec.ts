import { resolveSpec } from '../../src/spec/spec';

describe('spec', () => {
  it('should resolve a spec from url', async () => {
    const spec = await resolveSpec('http://petstore.swagger.io/v2/swagger.json');
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v2');
    expect(spec.securityDefinitions).toBeDefined();
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it('should resolve a spec from local file', async () => {
    const path = `${__dirname}/../petstore.yml`;
    const spec = await resolveSpec(path);
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v1');
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });
});
