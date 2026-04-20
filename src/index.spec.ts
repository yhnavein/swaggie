import { test, describe, beforeEach, expect, spyOn } from 'bun:test';
import fs from 'node:fs';

import { runCodeGenerator, applyConfigFile, prepareAppOptions } from './';
import { mockFetchWithFile } from '../test/test.utils';

import type { CliOptions } from './types';
import { APP_DEFAULTS } from './swagger';

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
      expect((e as Error).message).toContain('You need to provide');
    }
  });

  test('fails when null is passed as options', async () => {
    try {
      await runCodeGenerator(null as any);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain('Options were not provided');
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
      expect((e as Error).message).toContain('You need to provide');
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
      expect((e as Error).message).toContain('You need to provide');
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
      expect((e as Error).message).toContain('You need to provide');
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

  test('works with --out and local spec with external file refs', async () => {
    const parameters = {
      src: './test/external-refs/main.yml',
      out: './.tmp/test-external-refs/',
    };

    const [code] = await runCodeGenerator(parameters);
    expect(code).toContain('export interface Pet');
    expect(code).toContain('export interface User');
    expect(code).toContain('getPets(');
  });

  test('works with external refs to legacy root-level parameters', async () => {
    const parameters = {
      src: './test/external-refs/main-legacy-parameters.yml',
      out: './.tmp/test-external-legacy-params/',
    };

    const [code] = await runCodeGenerator(parameters);
    expect(code).toContain('getUserRoles');
    expect(code).toContain('userId: string');
  });

  test('works in schemas mode and emits all schemas', async () => {
    const parameters = {
      src: {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/UsedSchema' },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            UsedSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
            UnusedSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
      generationMode: 'schemas' as const,
    };

    const [code] = await runCodeGenerator(parameters);
    expect(code).toContain('/* tslint:disable */');
    expect(code).toContain('// deno-lint-ignore-file');
    expect(code).toContain('export interface UsedSchema');
    expect(code).toContain('export interface UnusedSchema');
    expect(code).not.toContain('getItems');
  });

  test('fails when wrong --config provided', async () => {
    const parameters = {
      config: './test/nonexistent-config.json',
    };

    try {
      await runCodeGenerator(parameters);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain('Could not correctly load config file');
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
      expect((e as Error).message).toContain('Could not correctly load config file');
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
      queryParamsAsObject: false,
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
      queryParamsAsObject: false,
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
      queryParamsAsObject: false,
    });
  });

  test('fails with a clear error when config file contains an empty array', async () => {
    // Write a temp config file containing an empty JSON array
    const tmpPath = './.tmp/test/empty-array-config.json';
    await Bun.write(tmpPath, '[]');
    try {
      await applyConfigFile({ config: tmpPath });
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain('Could not correctly load config file');
    }
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

    test('applies default generationMode when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.generationMode).toBe(APP_DEFAULTS.generationMode);
    });

    test('applies default schemaDeclarationStyle when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.schemaDeclarationStyle).toBe(APP_DEFAULTS.schemaDeclarationStyle);
    });

    test('applies default enumDeclarationStyle when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.enumDeclarationStyle).toBe(APP_DEFAULTS.enumDeclarationStyle);
    });

    test('applies default enumNamesStyle when none provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.enumNamesStyle).toBe(APP_DEFAULTS.enumNamesStyle);
    });

    test('result always has all AppOptions fields fully resolved', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.template).toBeDefined();
      expect(result.servicePrefix).toBeDefined();
      expect(result.nullableStrategy).toBeDefined();
      expect(result.generationMode).toBeDefined();
      expect(result.schemaDeclarationStyle).toBeDefined();
      expect(result.enumDeclarationStyle).toBeDefined();
      expect(result.enumNamesStyle).toBeDefined();
      expect(result.queryParamsSerialization.allowDots).toBeDefined();
      expect(result.queryParamsSerialization.arrayFormat).toBeDefined();
      expect(result.queryParamsSerialization.queryParamsAsObject).toBeDefined();
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
        queryParamsSerialization: {
          arrayFormat: 'indices',
          allowDots: false,
          queryParamsAsObject: 5,
        },
      });
      expect(result.queryParamsSerialization).toEqual({
        arrayFormat: 'indices',
        allowDots: false,
        queryParamsAsObject: 5,
      });
    });

    test('respects explicit queryParamsAsObject boolean', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        queryParamsSerialization: { queryParamsAsObject: true },
      });
      expect(result.queryParamsSerialization.queryParamsAsObject).toBe(true);
    });

    test('respects explicit generationMode', () => {
      const result = prepareAppOptions({ ...minimalOpts, generationMode: 'schemas' });
      expect(result.generationMode).toBe('schemas');
    });

    test('respects explicit schemaDeclarationStyle', () => {
      const result = prepareAppOptions({ ...minimalOpts, schemaDeclarationStyle: 'type' });
      expect(result.schemaDeclarationStyle).toBe('type');
    });

    test('respects explicit enumDeclarationStyle', () => {
      const result = prepareAppOptions({ ...minimalOpts, enumDeclarationStyle: 'enum' });
      expect(result.enumDeclarationStyle).toBe('enum');
    });

    test('respects explicit enumNamesStyle PascalCase', () => {
      const result = prepareAppOptions({ ...minimalOpts, enumNamesStyle: 'PascalCase' });
      expect(result.enumNamesStyle).toBe('PascalCase');
    });

    test('normalizes "pascal" to "PascalCase"', () => {
      const result = prepareAppOptions({ ...minimalOpts, enumNamesStyle: 'pascal' });
      expect(result.enumNamesStyle).toBe('PascalCase');
    });

    test('normalizes "pascalcase" (lowercase) to "PascalCase"', () => {
      const result = prepareAppOptions({ ...minimalOpts, enumNamesStyle: 'pascalcase' });
      expect(result.enumNamesStyle).toBe('PascalCase');
    });

    test('respects explicit enumNamesStyle original', () => {
      const result = prepareAppOptions({ ...minimalOpts, enumNamesStyle: 'original' });
      expect(result.enumNamesStyle).toBe('original');
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
        queryParamsSerialization: {
          allowDots: true,
          arrayFormat: 'indices',
          queryParamsAsObject: 10,
        },
        allowDots: false,
        arrayFormat: 'repeat',
        queryParamsAsObject: 3,
      });
      expect(result.queryParamsSerialization.allowDots).toBe(false);
      expect(result.queryParamsSerialization.arrayFormat).toBe('repeat');
      expect(result.queryParamsSerialization.queryParamsAsObject).toBe(3);
    });

    test('flat queryParamsAsObject overrides nested queryParamsSerialization', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        queryParamsSerialization: { queryParamsAsObject: true },
        queryParamsAsObject: 2,
      });
      expect(result.queryParamsSerialization.queryParamsAsObject).toBe(2);
    });

    test('flat mode overrides generationMode', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        generationMode: 'full',
        mode: 'schemas',
      });
      expect(result.generationMode).toBe('schemas');
    });

    test('flat schemaStyle overrides schemaDeclarationStyle', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        schemaDeclarationStyle: 'interface',
        schemaStyle: 'type',
      });
      expect(result.schemaDeclarationStyle).toBe('type');
    });

    test('flat enumStyle overrides enumDeclarationStyle', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        enumDeclarationStyle: 'union',
        enumStyle: 'enum',
      });
      expect(result.enumDeclarationStyle).toBe('enum');
    });

    test('flat nullables overrides nullableStrategy', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        nullableStrategy: 'ignore',
        nullables: 'include',
      });
      expect(result.nullableStrategy).toBe('include');
    });

    test('undefined flat options do not override nested queryParamsSerialization', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        queryParamsSerialization: {
          arrayFormat: 'brackets',
          allowDots: false,
          queryParamsAsObject: 4,
        },
        allowDots: undefined,
        arrayFormat: undefined,
        queryParamsAsObject: undefined,
      });
      expect(result.queryParamsSerialization.allowDots).toBe(false);
      expect(result.queryParamsSerialization.arrayFormat).toBe('brackets');
      expect(result.queryParamsSerialization.queryParamsAsObject).toBe(4);
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

  describe('template normalization', () => {
    test('normalizes "swr" to ["swr", "fetch"]', () => {
      const result = prepareAppOptions({ ...minimalOpts, template: 'swr' as any });
      expect(result.template).toEqual(['swr', 'fetch']);
    });

    test('normalizes "tsq" to ["tsq", "fetch"]', () => {
      const result = prepareAppOptions({ ...minimalOpts, template: 'tsq' as any });
      expect(result.template).toEqual(['tsq', 'fetch']);
    });

    test('passes through L1 templates unchanged', () => {
      expect(prepareAppOptions({ ...minimalOpts, template: 'axios' }).template).toBe('axios');
      expect(prepareAppOptions({ ...minimalOpts, template: 'fetch' }).template).toBe('fetch');
      expect(prepareAppOptions({ ...minimalOpts, template: 'xior' }).template).toBe('xior');
      expect(prepareAppOptions({ ...minimalOpts, template: 'ky' }).template).toBe('ky');
    });

    test('passes through [L2, L1] array unchanged', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        template: ['swr', 'axios'] as any,
      });
      expect(result.template).toEqual(['swr', 'axios']);
    });
  });

  describe('mocks and testingFramework', () => {
    test('passes mocks through when provided', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        mocks: './src/__mocks__/api.ts',
        testingFramework: 'vitest',
      });
      expect(result.mocks).toBe('./src/__mocks__/api.ts');
    });

    test('passes testingFramework through when provided', () => {
      const result = prepareAppOptions({
        ...minimalOpts,
        mocks: './src/__mocks__/api.ts',
        testingFramework: 'jest',
      });
      expect(result.testingFramework).toBe('jest');
    });

    test('mocks is absent from result when not provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.mocks).toBeUndefined();
    });

    test('testingFramework is absent from result when not provided', () => {
      const result = prepareAppOptions(minimalOpts);
      expect(result.testingFramework).toBeUndefined();
    });
  });
});

describe('runCodeGenerator — template validation', () => {
  test('rejects legacy "swr-axios" template name with migration hint', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: 'swr-axios',
    };

    try {
      await runCodeGenerator(parameters as any);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain('swr-axios');
      expect((e as Error).message).toContain('["swr", "axios"]');
    }
  });

  test('rejects legacy "tsq-xior" template name with migration hint', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: 'tsq-xior',
    };

    try {
      await runCodeGenerator(parameters as any);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain('tsq-xior');
      expect((e as Error).message).toContain('["tsq", "xior"]');
    }
  });

  test('accepts ["swr", "axios"] template pair and generates code', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: ['swr', 'axios'],
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    // Should contain both the axios HTTP client and SWR hooks
    expect(code).toContain('import Axios');
    expect(code).toContain('useSWR');
  });

  test('accepts ["tsq", "xior"] template pair and generates code', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: ['tsq', 'xior'],
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    expect(code).toContain('import xior');
    expect(code).toContain('useQuery');
  });

  test('accepts ["swr", "fetch"] template pair and generates code', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: ['swr', 'fetch'],
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    expect(code).toContain('defaults');
    expect(code).toContain('useSWR');
  });

  test('accepts "ky" template and generates code', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: 'ky',
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    expect(code).toContain("import ky");
    expect(code).toContain('KyOptions');
    expect(code).toContain('http.get(');
  });

  test('accepts ["swr", "ky"] template pair and generates code', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: ['swr', 'ky'],
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    expect(code).toContain("import ky");
    expect(code).toContain('useSWR');
  });

  test('accepts single "swr" and defaults to fetch as L1', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: 'swr',
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    expect(code).toContain('useSWR');
    // fetch base client should be present
    expect(code).toContain('defaults');
  });

  test('prepends "use client"; when useClient is true', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: ['swr', 'axios'],
      useClient: true,
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    expect(code.startsWith("'use client';\n")).toBe(true);
  });

  test('does not prepend "use client"; by default', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: ['swr', 'axios'],
    };

    const [code] = await runCodeGenerator(parameters as any);
    expect(code).toBeDefined();
    expect(code.startsWith("'use client'")).toBe(false);
  });

  test('useClient is preserved in returned options', async () => {
    const parameters = {
      src: './test/petstore-v3.yml',
      template: ['tsq', 'fetch'],
      useClient: true,
    };

    const [, opts] = await runCodeGenerator(parameters as any);
    expect(opts.useClient).toBe(true);
  });

  // ── mock flag validation ───────────────────────────────────────────────────

  test('fails when --mocks is provided without --testingFramework', async () => {
    try {
      await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: './.tmp/test/api.ts',
        mocks: './.tmp/test/api.mock.ts',
      } as any);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain(
        '--mocks and --testingFramework must be used together'
      );
    }
  });

  test('fails when --testingFramework is provided without --mocks', async () => {
    try {
      await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: './.tmp/test/api.ts',
        testingFramework: 'vitest',
      } as any);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain(
        '--mocks and --testingFramework must be used together'
      );
    }
  });

  test('fails when --mocks is provided without --out', async () => {
    try {
      await runCodeGenerator({
        src: './test/petstore-v3.yml',
        mocks: './.tmp/test/api.mock.ts',
        testingFramework: 'vitest',
      } as any);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect((e as Error).message).toContain('--mocks requires --out to be set');
    }
  });

  test('generates mock file alongside client when --mocks and --testingFramework are set', async () => {
    const outPath = './.tmp/test/mock-gen-test/api.ts';
    const mocksPath = './.tmp/test/mock-gen-test/api.mock.ts';

    await runCodeGenerator({
      src: './test/petstore-v3.yml',
      out: outPath,
      mocks: mocksPath,
      testingFramework: 'vitest',
    } as any);

    const mockFile = await Bun.file(mocksPath).text();
    expect(mockFile).toContain('createClientMocks');
    expect(mockFile).toContain("import { type MockInstance, vi } from 'vitest'");
    expect(mockFile).toContain("import * as realApi from './api'");
  });

  test('mock file uses jest primitives when testingFramework is jest', async () => {
    const outPath = './.tmp/test/mock-gen-jest/api.ts';
    const mocksPath = './.tmp/test/mock-gen-jest/api.mock.ts';

    await runCodeGenerator({
      src: './test/petstore-v3.yml',
      out: outPath,
      mocks: mocksPath,
      testingFramework: 'jest',
    } as any);

    const mockFile = await Bun.file(mocksPath).text();
    expect(mockFile).toContain("import { jest } from '@jest/globals'");
    expect(mockFile).toContain('jest.spyOn(');
  });

  describe('--hooksOut', () => {
    test('fails when --hooksOut is provided without --out', async () => {
      try {
        await runCodeGenerator({
          src: './test/petstore-v3.yml',
          template: ['swr', 'axios'],
          hooksOut: './.tmp/test/hooks.ts',
        } as any);
        throw new Error('Expected error to be thrown');
      } catch (e) {
        expect((e as Error).message).toContain('--hooksOut requires --out to be set');
      }
    });

    test('fails when --hooksOut is used with a non-L2 template', async () => {
      try {
        await runCodeGenerator({
          src: './test/petstore-v3.yml',
          out: './.tmp/test/api.ts',
          template: 'axios',
          hooksOut: './.tmp/test/hooks.ts',
        } as any);
        throw new Error('Expected error to be thrown');
      } catch (e) {
        expect((e as Error).message).toContain('--hooksOut requires an L2 template');
      }
    });

    test('generates separate hooks file when --hooksOut is set', async () => {
      const outPath = './.tmp/test/hooks-split/api.ts';
      const hooksPath = './.tmp/test/hooks-split/hooks.ts';

      const [mainCode] = await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: ['swr', 'axios'],
        hooksOut: hooksPath,
      } as any);

      const hooksFile = await Bun.file(hooksPath).text();

      // Main file should NOT contain hook exports or SWR imports
      expect(mainCode).not.toContain('useSWR');
      expect(mainCode).not.toContain('export const pet =');
      // Main file SHOULD contain HTTP client
      expect(mainCode).toContain('export const petClient =');
      // Main file SHOULD export encodeParams
      expect(mainCode).toContain('export function encodeParams');

      // Hooks file SHOULD contain SWR imports and hook exports
      expect(hooksFile).toContain("import useSWR");
      expect(hooksFile).toContain("import * as API from './api'");
      expect(hooksFile).toContain('export const pet =');
      // Hooks file should NOT contain HTTP client setup
      expect(hooksFile).not.toContain('petClient =');
    });

    test('prepends use client directive only to hooks file when --hooksOut and --useClient are set', async () => {
      const outPath = './.tmp/test/hooks-use-client/api.ts';
      const hooksPath = './.tmp/test/hooks-use-client/hooks.ts';

      const [mainCode] = await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: ['swr', 'axios'],
        hooksOut: hooksPath,
        useClient: true,
      } as any);

      const hooksFile = await Bun.file(hooksPath).text();

      expect(mainCode.startsWith("'use client'")).toBe(false);
      expect(hooksFile.startsWith("'use client';\n")).toBe(true);
    });

    test('generates hooks file that references main file via API namespace', async () => {
      const outPath = './.tmp/test/hooks-api-ref/api.ts';
      const hooksPath = './.tmp/test/hooks-api-ref/hooks.ts';

      await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: ['tsq', 'xior'],
        hooksOut: hooksPath,
      } as any);

      const hooksFile = await Bun.file(hooksPath).text();

      // Hooks reference API.petClient for HTTP calls
      expect(hooksFile).toContain('API.petClient.');
      // Return types are prefixed with API.
      expect(hooksFile).toContain('API.Pet');
      // Local queryKeys references use bare name (not API.pet.queryKeys)
      expect(hooksFile).toContain('pet.queryKeys.');
    });
  });

  // ── --clientSetup flag validation ─────────────────────────────────────────

  describe('--clientSetup', () => {
    test('fails when --clientSetup is provided without --out', async () => {
      try {
        await runCodeGenerator({
          src: './test/petstore-v3.yml',
          template: 'ky',
          clientSetup: './.tmp/test/api.setup.ts',
        } as any);
        throw new Error('Expected error to be thrown');
      } catch (e) {
        expect((e as Error).message).toContain('--clientSetup requires --out to be set');
      }
    });

    test('fails when --forceSetup is provided without --clientSetup', async () => {
      try {
        await runCodeGenerator({
          src: './test/petstore-v3.yml',
          out: './.tmp/test/api.ts',
          forceSetup: true,
        } as any);
        throw new Error('Expected error to be thrown');
      } catch (e) {
        expect((e as Error).message).toContain('--forceSetup requires --clientSetup to be set');
      }
    });

    test('ky with --clientSetup generates lazy initKyHttp/getKyHttp in api.ts', async () => {
      const outPath = './.tmp/test/ky-with-setup/api.ts';
      const setupPath = './.tmp/test/ky-with-setup/api.setup.ts';

      const [code] = await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: 'ky',
        clientSetup: setupPath,
      } as any);

      expect(code).toContain('initKyHttp');
      expect(code).toContain('getKyHttp');
      expect(code).toContain("import { createKyConfig }");
      expect(code).toContain("getKyHttp().");
      expect(code).not.toContain('export const http = ky.create');
    });

    test('ky with --clientSetup writes setup scaffold that is not overwritten on second run', async () => {
      const outPath = './.tmp/test/ky-setup-guard/api.ts';
      const setupPath = './.tmp/test/ky-setup-guard/api.setup.ts';

      // First run — scaffold should be created (forceSetup to clear any prior state)
      await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: 'ky',
        clientSetup: setupPath,
        forceSetup: true,
      } as any);

      const setupFile = await Bun.file(setupPath).text();
      expect(setupFile).toContain('createKyConfig');
      expect(setupFile).toContain('GENERATED ONCE');

      // Overwrite with a sentinel to detect re-generation
      await Bun.file(setupPath).write('// sentinel');

      // Second run — scaffold must NOT be overwritten
      await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: 'ky',
        clientSetup: setupPath,
      } as any);

      const afterSecondRun = await Bun.file(setupPath).text();
      expect(afterSecondRun).toBe('// sentinel');
    });

    test('ky with --clientSetup and --forceSetup overwrites existing setup file', async () => {
      const outPath = './.tmp/test/ky-force-setup/api.ts';
      const setupPath = './.tmp/test/ky-force-setup/api.setup.ts';

      // Write sentinel
      await Bun.write(setupPath, '// sentinel');

      await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: 'ky',
        clientSetup: setupPath,
        forceSetup: true,
      } as any);

      const setupFile = await Bun.file(setupPath).text();
      expect(setupFile).toContain('createKyConfig');
      expect(setupFile).not.toBe('// sentinel');
    });

    test('xior with --clientSetup generates interceptor scaffold (not imported by api.ts)', async () => {
      const outPath = './.tmp/test/xior-with-setup/api.ts';
      const setupPath = './.tmp/test/xior-with-setup/api.setup.ts';

      const [code] = await runCodeGenerator({
        src: './test/petstore-v3.yml',
        out: outPath,
        template: 'xior',
        clientSetup: setupPath,
      } as any);

      // api.ts must NOT import the setup file for xior
      expect(code).not.toContain('api.setup');
      // api.ts should still be the normal xior template
      expect(code).toContain("import xior");

      const setupFile = await Bun.file(setupPath).text();
      expect(setupFile).toContain('setupApiClient');
      expect(setupFile).toContain('interceptors.request.use');
      expect(setupFile).toContain('GENERATED ONCE');
    });
  });
});
