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

    const res = await runCodeGenerator(parameters);
    expect(res).to.be.ok;
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
    const stub = sinon.stub(fetch, 'default');
    const response = fs.readFileSync(`${__dirname}/../test/petstore-v3.json`, {
      encoding: 'utf-8',
    });
    stub.returns(new Promise((resolve) => resolve(new Response(response))));

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
