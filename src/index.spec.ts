import { test, describe, beforeEach, expect, spyOn } from 'bun:test';

import { runCodeGenerator, applyConfigFile, prepareAppOptions } from './';
import { mockFetchWithFile } from '../test/test.utils';

import type { CliOptions } from './types';
import { APP_DEFAULTS } from './types';

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

describe('prepareAppOptions', () => {
  const minimalOpts = {
    src: 'http://example.com/api.json',
    queryParamsSerialization: {},
  } as CliOptions;

  describe('defaults', () => {
    test('applies default template when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.template).toBe(APP_DEFAULTS.template);
    });

    test('applies default servicePrefix when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.servicePrefix).toBe(APP_DEFAULTS.servicePrefix);
    });

    test('applies default nullableStrategy when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.nullableStrategy).toBe(APP_DEFAULTS.nullableStrategy);
    });

    test('applies default queryParamsSerialization when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.queryParamsSerialization).toEqual(APP_DEFAULTS.queryParamsSerialization);
    });

    test('result always has all AppOptions fields fully resolved', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.template).toBeDefined();
      expect(result.servicePrefix).toBeDefined();
      expect(result.nullableStrategy).toBeDefined();
      expect(result.queryParamsSerialization.allowDots).toBeDefined();
      expect(result.queryParamsSerialization.arrayFormat).toBeDefined();
    });
  });

  describe('explicit values override defaults', () => {
    test('respects explicit template', () => {
      const result = prepareAppOptions({ ...minimalOpts, template: 'fetch' });
      expect(result.template).toBe('fetch');
    });

    test('respects explicit servicePrefix', () => {
      const result = prepareAppOptions({ ...minimalOpts, servicePrefix: 'My' });
      expect(result.servicePrefix).toBe('My');
    });

    test('respects nullableStrategy: include', () => {
      const result = prepareAppOptions({ ...minimalOpts, nullableStrategy: 'include' });
      expect(result.nullableStrategy).toBe('include');
    });

    test('respects nullableStrategy: nullableAsOptional', () => {
      const result = prepareAppOptions({ ...minimalOpts, nullableStrategy: 'nullableAsOptional' });
      expect(result.nullableStrategy).toBe('nullableAsOptional');
    });

    test('respects nullableStrategy: ignore', () => {
      const result = prepareAppOptions({ ...minimalOpts, nullableStrategy: 'ignore' });
      expect(result.nullableStrategy).toBe('ignore');
    });

    test('respects explicit queryParamsSerialization', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        queryParamsSerialization: { arrayFormat: 'indices', allowDots: false },
      });
      expect(result.queryParamsSerialization).toEqual({ arrayFormat: 'indices', allowDots: false });
    });
  });

  describe('flat CLI options are lifted into queryParamsSerialization', () => {
    test('flat allowDots overrides nested default', () => {
      const result = prepareAppOptions({ ...minimalOpts, allowDots: false });
      expect(result.queryParamsSerialization.allowDots).toBe(false);
    });

    test('flat arrayFormat overrides nested default', () => {
      const result = prepareAppOptions({ ...minimalOpts, arrayFormat: 'brackets' });
      expect(result.queryParamsSerialization.arrayFormat).toBe('brackets');
    });

    test('flat options take precedence over nested queryParamsSerialization', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        queryParamsSerialization: { allowDots: true, arrayFormat: 'indices' },
        allowDots: false,
        arrayFormat: 'repeat',
      });
      expect(result.queryParamsSerialization.allowDots).toBe(false);
      expect(result.queryParamsSerialization.arrayFormat).toBe('repeat');
    });

    test('undefined flat options do not override nested queryParamsSerialization', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        queryParamsSerialization: { arrayFormat: 'brackets', allowDots: false },
        allowDots: undefined,
        arrayFormat: undefined,
      });
      expect(result.queryParamsSerialization.allowDots).toBe(false);
      expect(result.queryParamsSerialization.arrayFormat).toBe('brackets');
    });
  });

  describe('passthrough of non-defaulted fields', () => {
    test('preserves src', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.src).toBe('http://example.com/api.json');
    });

    test('preserves out when provided', () => {
      const result = prepareAppOptions({ ...minimalOpts, out: './output.ts' });
      expect(result.out).toBe('./output.ts');
    });

    test('preserves baseUrl when provided', () => {
      const result = prepareAppOptions({ ...minimalOpts, baseUrl: '/api' });
      expect(result.baseUrl).toBe('/api');
    });

    test('preserves preferAny when provided', () => {
      const result = prepareAppOptions({ ...minimalOpts, preferAny: true });
      expect(result.preferAny).toBe(true);
    });

    test('preserves skipDeprecated when provided', () => {
      const result = prepareAppOptions({ ...minimalOpts, skipDeprecated: true });
      expect(result.skipDeprecated).toBe(true);
    });

    test('preserves modifiers when provided', () => {
      const modifiers = { parameters: { orgId: 'optional' as const } };
      const result = prepareAppOptions({ ...minimalOpts, modifiers });
      expect(result.modifiers).toEqual(modifiers);
    });
  });
});
