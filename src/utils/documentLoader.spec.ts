import { expect } from 'chai';
import { MockAgent, setGlobalDispatcher } from 'undici';

import { loadSpecDocument } from './documentLoader';
import { mockRequest } from '../../test/test.utils';

// URLs are not used to fetch anything. We are faking responses through SinonJS
const petstore3 = {
  json: 'https://petstore.swagger.io/v3/swagger.json',
  yaml: 'https://petstore.swagger.io/v3/swagger.yaml',
};

describe('loadSpecDocument', () => {
  let mockAgent: MockAgent;

  beforeEach(() => {
    // Create a new MockAgent
    mockAgent = new MockAgent();
    // Make sure that we don't actually make real requests
    mockAgent.disableNetConnect();
    // Set the mocked agent as the global dispatcher
    setGlobalDispatcher(mockAgent);
  });

  it('should resolve a JSON spec from url', async () => {
    mockRequest(mockAgent, petstore3.json, 'petstore-v3.json');

    const spec = await loadSpecDocument(petstore3.json);
    expect(spec).to.be.ok;
    expect(spec.paths).to.be.ok;
  });

  it('should resolve a YAML spec from url', async () => {
    mockRequest(mockAgent, petstore3.yaml, 'petstore-v3.yml');

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
