import { expect } from 'chai';
import fs from 'fs';
import * as fetch from 'node-fetch';
import { Response } from 'node-fetch';
import sinon from 'sinon';
import { resolveSpec } from './swagger';

// URLs are not used to fetch anything. We are faking responses through SinonJS
const petstore2 = {
  json: 'http://petstore.swagger.io/v2/swagger.json',
  yaml: 'http://petstore.swagger.io/v2/swagger.yaml',
};

describe('resolveSpec', () => {
  afterEach(sinon.restore);

  it('should resolve a JSON spec from url', async () => {
    const stub = sinon.stub(fetch, 'default');
    const response = fs.readFileSync(`${__dirname}/../../test/petstore-v2.json`, {
      encoding: 'utf-8',
    });
    stub.returns(new Promise((resolve) => resolve(new Response(response))));

    const spec = await resolveSpec(petstore2.json);
    expect(spec).to.be.ok;
    expect(spec.host).to.be.equal('petstore.swagger.io');
    expect(spec.basePath).to.be.equal('/v2');
    expect(spec.securityDefinitions).to.be.ok;
    expect(spec.definitions).to.be.ok;
    expect(spec.paths).to.be.ok;
  });

  it('should resolve a YAML spec from url', async () => {
    const stub = sinon.stub(fetch, 'default');
    const response = fs.readFileSync(`${__dirname}/../../test/petstore.yml`, {
      encoding: 'utf-8',
    });
    stub.returns(new Promise((resolve) => resolve(new Response(response))));

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
