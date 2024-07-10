import { expect } from 'chai';
import { MockAgent, setGlobalDispatcher } from 'undici';

import { runCodeGenerator, applyConfigFile } from './';
import { mockRequest } from './utils';
import type { CliOptions } from './types';

describe('runCodeGenerator', () => {
  let mockAgent: MockAgent;

  beforeEach(() => {
    // Create a new MockAgent
    mockAgent = new MockAgent();
    // Make sure that we don't actually make real requests
    mockAgent.disableNetConnect();
    // Set the mocked agent as the global dispatcher
    setGlobalDispatcher(mockAgent);
  });

  it('fails with no parameters provided', async () => {
    const parameters = {};

    try {
      return await runCodeGenerator(parameters);
    } catch (e) {
      return expect(e.message).to.contain('You need to provide');
    }
  });

  it('fails with only --out provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      return await runCodeGenerator(parameters);
    } catch (e) {
      return expect(e.message).to.contain('You need to provide');
    }
  });

  it('fails with both --config and --src provided', async () => {
    const parameters = {
      config: './test/sample-config.json',
      src: 'https://google.pl',
    };

    try {
      return await runCodeGenerator(parameters);
    } catch (e) {
      return expect(e.message).to.contain('You need to provide');
    }
  });

  it('fails when there is no --config or --src provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      await runCodeGenerator(parameters);
    } catch (e) {
      return expect(e.message).to.contain('You need to provide');
    }
  });

  it('works with --out and --src provided', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      out: './.tmp/test/',
    };

    const conf = await runCodeGenerator(parameters);
    expect(conf).to.be.ok;
  });

  it('fails when wrong --config provided', async () => {
    const parameters = {
      config: './test/nonexistent-config.json',
    };

    try {
      await runCodeGenerator(parameters);
    } catch (e) {
      return expect(e).to.contain('Could not correctly load config file');
    }
  });

  it('fails when --config provided and the JSON file is wrong', async () => {
    const parameters = {
      config: './test/petstore-v3.yml',
    };

    try {
      await runCodeGenerator(parameters);
    } catch (e) {
      return expect(e).to.contain('Could not correctly load config file');
    }
  });

  it('works with proper --config provided', async () => {
    mockRequest(
      mockAgent,
      'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.json',
      'petstore-v3.json'
    );

    const parameters = {
      config: './test/sample-config.json',
    };

    try {
      const res = await runCodeGenerator(parameters);
      expect(res).to.be.ok;
    } catch (e) {
      console.log(e);
      return expect(e).to.contain('Could not correctly load config file');
    }
  });
});

describe('applyConfigFile', () => {
  it('should use default values', async () => {
    const parameters = { src: './test/petstore-v3.yml', out: './.tmp/test/' };

    const conf = await applyConfigFile(parameters);

    expect(conf).to.be.ok;
    expect(conf.queryParamsSerialization).to.deep.equal({
      arrayFormat: 'repeat',
      allowDots: true,
    });
    expect(conf.template).to.be.equal('axios');
  });

  it('should load configuration from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
    };

    const conf = await applyConfigFile(parameters);

    expect(conf).to.be.ok;
    expect(conf.baseUrl).to.be.equal('https://google.pl');
    expect(conf.src).to.be.equal(
      'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.json'
    );
    expect(conf.queryParamsSerialization).to.deep.equal({
      arrayFormat: 'repeat',
      allowDots: true,
    });
    expect(conf.template).to.be.equal('xior');
  });

  it('should treat inline parameters with a higher priority', async () => {
    const parameters: Partial<CliOptions> = {
      config: './test/sample-config.json',
      baseUrl: 'https://wp.pl',
      src: './test/petstore-v3.yml',
      arrayFormat: 'indices',
      allowDots: false,
      template: 'fetch',
    };

    const conf = await applyConfigFile(parameters);

    expect(conf).to.be.ok;
    expect(conf.baseUrl).to.be.equal('https://wp.pl');
    expect(conf.src).to.be.equal('./test/petstore-v3.yml');
    expect(conf.template).to.be.equal('fetch');
    expect(conf.queryParamsSerialization).to.deep.equal({
      arrayFormat: 'indices',
      allowDots: false,
    });
  });
});
