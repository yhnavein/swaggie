import { loadSpecification } from './specLoader';

const petstore2 = {
  json: 'http://petstore.swagger.io/v2/swagger.json',
  yaml:
    'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/master/examples/v2.0/yaml/petstore.yaml',
};

describe('loadSpecification', () => {
  it('should resolve a JSON spec from url', async () => {
    const spec = await loadSpecification(petstore2.json);
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v2');
    expect(spec.securityDefinitions).toBeDefined();
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it('should resolve a YAML spec from url', async () => {
    const spec = await loadSpecification(petstore2.yaml);
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v1');
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it('should resolve a YAML spec from local file', async () => {
    const path = `${__dirname}/../test/petstore2.yml`;
    const spec = await loadSpecification(path);
    expect(spec).toBeDefined();
    expect(spec.host).toBe('petstore.swagger.io');
    expect(spec.basePath).toBe('/v1');
    expect(spec.definitions).toBeDefined();
    expect(spec.paths).toBeDefined();
  });
});
