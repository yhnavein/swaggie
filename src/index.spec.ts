import { test, describe, beforeEach, expect, spyOn } from 'bun:test';

import { runCodeGenerator, applyConfigFile } from './';
import { mockFetchWithFile } from '../test/test.utils';

import type { CliOptions } from './types';

describe('runCodeGenerator', () => {
  let mockFetch: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Spy on the global fetch function
    mockFetch = spyOn(global, 'fetch');
  });

  test('fails with no parameters provided', async () => {
    const parameters = {};

    try {
      await runCodeGenerator(parameters);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message).toContain('You need to provide');
    }
  });

  test('fails with only --out provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      await runCodeGenerator(parameters);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message).toContain('You need to provide');
    }
  });

  test('fails with both --config and --src provided', async () => {
    const parameters = {
      config: './test/sample-config.json',
      src: 'https://google.pl',
    };

    try {
      await runCodeGenerator(parameters);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message).toContain('You need to provide');
    }
  });

  test('fails when there is no --config or --src provided', async () => {
    const parameters = {
      out: './.tmp/test/',
    };

    try {
      await runCodeGenerator(parameters);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message).toContain('You need to provide');
    }
  });

  test('works with --out and --src provided', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      out: './.tmp/test/',
    };

    const conf = await runCodeGenerator(parameters);
    expect(conf).toBeDefined();
  });

  test('fails when wrong --config provided', async () => {
    const parameters = {
      config: './test/nonexistent-config.json',
    };

    try {
      await runCodeGenerator(parameters);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message).toContain('Could not correctly load config file');
    }
  });

  test('fails when --config provided and the JSON file is wrong', async () => {
    const parameters = {
      config: './test/petstore-v3.yml',
    };

    try {
      await runCodeGenerator(parameters);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message).toContain('Could not correctly load config file');
    }
  });

  test('works with proper --config provided', async () => {
    await mockFetchWithFile(
      mockFetch,
      'https://raw.githubusercontent.com/readmeio/oas-examples/refs/heads/main/3.0/json/petstore.json',
      'petstore-v3.json'
    );

    const parameters = {
      config: './test/sample-config.json',
    };

    expect(async () => {
      await runCodeGenerator(parameters);
    }).not.toThrow('Could not correctly load config file');
  });
});

describe('applyConfigFile', () => {
  test('should use default values', async () => {
    const parameters = { src: './test/petstore-v3.yml', out: './.tmp/test/' };

    const conf = await applyConfigFile(parameters);

    expect(conf).toBeDefined();
    expect(conf.queryParamsSerialization).toEqual({
      arrayFormat: 'repeat',
      allowDots: true,
    });
    expect(conf.template).toBe('axios');
  });

  test('should load configuration from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
    };

    const conf = await applyConfigFile(parameters);

    expect(conf).toBeDefined();
    expect(conf.baseUrl).toBe('https://google.pl');
    expect(
      conf.src,
      'https://raw.githubusercontent.com/readmeio/oas-examples/refs/heads/main/3.0/json/petstore.json'
    );
    expect(conf.queryParamsSerialization).toEqual({
      arrayFormat: 'repeat',
      allowDots: true,
    });
    expect(conf.template).toBe('xior');
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

    expect(conf).toBeDefined();
    expect(conf.baseUrl).toBe('https://wp.pl');
    expect(conf.src).toBe('./test/petstore-v3.yml');
    expect(conf.template).toBe('fetch');
    expect(conf.queryParamsSerialization).toEqual({
      arrayFormat: 'indices',
      allowDots: false,
    });
  });
});
