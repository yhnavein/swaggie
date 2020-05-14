import { resolveSpec } from './spec';

const petstore2 = {
  json: 'http://petstore.swagger.io/v2/swagger.json',
  yaml:
    'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/master/examples/v2.0/yaml/petstore.yaml',
};

describe('resolveSpec', () => {
  it('should resolve a JSON spec from url', async () => {
    const spec = await resolveSpec(petstore2.json);
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v2');
    expect(spec.securityDefinitions).toBeDefined();
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it('should resolve a YAML spec from url', async () => {
    const spec = await resolveSpec(petstore2.yaml);
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v1');
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it('should resolve a YAML spec from local file', async () => {
    const path = `${__dirname}/../../test/petstore.yml`;
    const spec = await resolveSpec(path);
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v1');
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });
});
