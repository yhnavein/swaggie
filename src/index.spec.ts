import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MockAgent, setGlobalDispatcher } from 'undici';

import { runCodeGenerator, applyConfigFile } from './';
import { mockRequest } from '../test/test.utils';
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

  test('fails with no parameters provided', async () => {
    const parameters = {};

    try {
      await runCodeGenerator(parameters);
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert(e.message.includes('You need to provide'));
    }
  });

  test('fails with only --out provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      await runCodeGenerator(parameters);
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert(e.message.includes('You need to provide'));
    }
  });

  test('fails with both --config and --src provided', async () => {
    const parameters = {
      config: './test/sample-config.json',
      src: 'https://google.pl',
    };

    try {
      await runCodeGenerator(parameters);
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert(e.message.includes('You need to provide'));
    }
  });

  test('fails when there is no --config or --src provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      await runCodeGenerator(parameters);
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert(e.message.includes('You need to provide'));
    }
  });

  test('works with --out and --src provided', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      out: './.tmp/test/',
    };

    const conf = await runCodeGenerator(parameters);
    assert(conf);
  });

  test('fails when wrong --config provided', async () => {
    const parameters = {
      config: './test/nonexistent-config.json',
    };

    try {
      await runCodeGenerator(parameters);
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert(e.toString().includes('Could not correctly load config file'));
    }
  });

  test('fails when --config provided and the JSON file is wrong', async () => {
    const parameters = {
      config: './test/petstore-v3.yml',
    };

    try {
      await runCodeGenerator(parameters);
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert(e.toString().includes('Could not correctly load config file'));
    }
  });

  test('works with proper --config provided', async () => {
    mockRequest(
      mockAgent,
      'https://raw.githubusercontent.com/readmeio/oas-examples/refs/heads/main/3.0/json/petstore.json',
      'petstore-v3.json'
    );

    const parameters = {
      config: './test/sample-config.json',
    };

    try {
      const res = await runCodeGenerator(parameters);
      assert(res);
    } catch (e) {
      console.log(e);
      assert(e.toString().includes('Could not correctly load config file'));
    }
  });
});

describe('applyConfigFile', () => {
  test('should use default values', async () => {
    const parameters = { src: './test/petstore-v3.yml', out: './.tmp/test/' };

    const conf = await applyConfigFile(parameters);

    assert(conf);
    assert.deepStrictEqual(conf.queryParamsSerialization, {
      arrayFormat: 'repeat',
      allowDots: true,
    });
    assert.strictEqual(conf.template, 'axios');
  });

  test('should load configuration from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
    };

    const conf = await applyConfigFile(parameters);

    assert(conf);
    assert.strictEqual(conf.baseUrl, 'https://google.pl');
    assert.strictEqual(
      conf.src,
      'https://raw.githubusercontent.com/readmeio/oas-examples/refs/heads/main/3.0/json/petstore.json'
    );
    assert.deepStrictEqual(conf.queryParamsSerialization, {
      arrayFormat: 'repeat',
      allowDots: true,
    });
    assert.strictEqual(conf.template, 'xior');
  });

  test('should treat inline parameters with a higher priority', async () => {
    const parameters: Partial<CliOptions> = {
      config: './test/sample-config.json',
      baseUrl: 'https://wp.pl',
      src: './test/petstore-v3.yml',
      arrayFormat: 'indices',
      allowDots: false,
      template: 'fetch',
    };

    const conf = await applyConfigFile(parameters);

    assert(conf);
    assert.strictEqual(conf.baseUrl, 'https://wp.pl');
    assert.strictEqual(conf.src, './test/petstore-v3.yml');
    assert.strictEqual(conf.template, 'fetch');
    assert.deepStrictEqual(conf.queryParamsSerialization, {
      arrayFormat: 'indices',
      allowDots: false,
    });
  });
});
