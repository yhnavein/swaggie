import { expect } from 'chai';
import { resolveSpec } from './swagger';

const petstore2 = {
  json: 'http://petstore.swagger.io/v2/swagger.json',
  yaml: 'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/master/examples/v2.0/yaml/petstore.yaml',
};

describe('resolveSpec', () => {
  it('should resolve a JSON spec from url', async () => {
    const spec = await resolveSpec(petstore2.json);
    expect(spec).to.be.ok;
    expect(spec.host).to.be.equal('petstore.swagger.io');
    expect(spec.basePath).to.be.equal('/v2');
    expect(spec.securityDefinitions).to.be.ok;
    expect(spec.definitions).to.be.ok;
    expect(spec.paths).to.be.ok;
  });

  it('should resolve a YAML spec from url', async () => {
    const spec = await resolveSpec(petstore2.yaml);
    expect(spec).to.be.ok;
    expect(spec.host).to.be.equal('petstore.swagger.io');
    expect(spec.basePath).to.be.equal('/v1');
    expect(spec.definitions).to.be.ok;
    expect(spec.paths).to.be.ok;
  });

  it('should resolve a YAML spec from local file', async () => {
    const path = `${__dirname}/../../test/petstore.yml`;
    const spec = await resolveSpec(path);
    expect(spec).to.be.ok;
    expect(spec.host).to.be.equal('petstore.swagger.io');
    expect(spec.basePath).to.be.equal('/v1');
    expect(spec.definitions).to.be.ok;
    expect(spec.paths).to.be.ok;
  });
});
