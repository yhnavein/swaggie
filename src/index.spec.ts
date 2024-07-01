import { expect } from 'chai';
import fs from 'node:fs';
import * as fetch from 'node-fetch';
import { Response } from 'node-fetch';
import sinon from 'sinon';

import { runCodeGenerator, applyConfigFile } from './';

describe('runCodeGenerator', () => {
  afterEach(sinon.restore);

  it('fails with no parameters provided', async () => {
    const parameters = {};

    try {
      return await runCodeGenerator(parameters as any);
    } catch (e) {
      return expect(e.message).to.contain('You need to provide');
    }
  });

  it('fails with only --out provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      return await runCodeGenerator(parameters as any);
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
      return await runCodeGenerator(parameters as any);
    } catch (e) {
      return expect(e.message).to.contain('You need to provide');
    }
  });

  it('fails when there is no --config or --src provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      await runCodeGenerator(parameters as any);
    } catch (e) {
      return expect(e.message).to.contain('You need to provide');
    }
  });

  it('works with --out and --src provided', () => {
    const parameters = {
      src: 'http://petstore.swagger.io/v2/swagger.json',
      out: './.tmp/test/',
    };

    runCodeGenerator(parameters as any).then((res) => {
      expect(res).to.be.ok;
    });
  });

  it('fails when wrong --config provided', (done) => {
    const parameters = {
      config: './test/nonexistent-config.json',
    };

    runCodeGenerator(parameters as any)
      .then(() => {})
      .catch((e) => expect(e).to.contain('Could not correctly load config file'))
      .finally(() => done());
  });

  it('fails when --config provided and the JSON file is wrong', () => {
    const parameters = {
      config: './test/petstore-v3.yml',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).to.contain('Could not correctly load config file')
    );
  });

  it('works with proper --config provided', (done) => {
    const stub = sinon.stub(fetch, 'default');
    const response = fs.readFileSync(`${__dirname}/../test/petstore-v3.json`, {
      encoding: 'utf-8',
    });
    stub.returns(new Promise((resolve) => resolve(new Response(response))));

    const parameters = {
      config: './test/sample-config.json',
    };

    runCodeGenerator(parameters as any)
      .then((res) => {
        expect(res).to.be.ok;
      })
      .finally(() => done());
  });

  it('properly loads configuration from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
    };
    const conf = await applyConfigFile(parameters);
    expect(conf).to.be.ok;
    expect(conf.baseUrl).to.be.equal('https://google.pl');
    expect(conf.src).to.be.equal(
      'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.json'
    );
  });

  it('makes inline parameters higher priority than from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
      baseUrl: 'https://wp.pl',
      src: './test/petstore-v3.yml',
    };
    const conf = await applyConfigFile(parameters);
    expect(conf).to.be.ok;
    expect(conf.baseUrl).to.be.equal('https://wp.pl');
    expect(conf.src).to.be.equal('./test/petstore-v3.yml');
  });
});
