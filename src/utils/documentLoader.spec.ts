import { expect } from 'chai';
import fs from 'node:fs';
import * as fetch from 'node-fetch';
import { Response } from 'node-fetch';
import sinon from 'sinon';
import { loadSpecDocument } from './documentLoader';

// URLs are not used to fetch anything. We are faking responses through SinonJS
const petstore3 = {
  json: 'http://petstore.swagger.io/v3/swagger.json',
  yaml: 'http://petstore.swagger.io/v3/swagger.yaml',
};

describe('loadSpecDocument', () => {
  afterEach(sinon.restore);

  it('should resolve a JSON spec from url', async () => {
    const stub = sinon.stub(fetch, 'default');
    const response = fs.readFileSync(`${__dirname}/../../test/petstore-v3.json`, {
      encoding: 'utf-8',
    });
    stub.returns(new Promise((resolve) => resolve(new Response(response))));

    const spec = await loadSpecDocument(petstore3.json);
    expect(spec).to.be.ok;
    expect(spec.paths).to.be.ok;
  });

  it('should resolve a YAML spec from url', async () => {
    const stub = sinon.stub(fetch, 'default');
    const response = fs.readFileSync(`${__dirname}/../../test/petstore-v3.yml`, {
      encoding: 'utf-8',
    });
    stub.returns(new Promise((resolve) => resolve(new Response(response))));

    const spec = await loadSpecDocument(petstore3.yaml);
    expect(spec).to.be.ok;
    expect(spec.paths).to.be.ok;
  });

  it('should resolve a YAML spec from local file', async () => {
    const path = `${__dirname}/../../test/petstore-v3.yml`;
    const spec = await loadSpecDocument(path);
    expect(spec).to.be.ok;
    expect(spec.paths).to.be.ok;
  });
});
