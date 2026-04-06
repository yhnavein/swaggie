import { test, describe, expect, beforeAll } from 'bun:test';

import generateMocks from './genMocks';
import { getDocument, getClientOptions } from '../../test/test.utils';
import { loadAllTemplateFiles } from '../utils';
import { normalizeTemplate } from '../utils/templateValidator';

// A minimal spec with one GET and one POST under a single tag.
// This is enough to exercise queries, mutations, and client stubs without
// pulling in the full petstore fixture.
const SIMPLE_SPEC = getDocument({
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        tags: ['pets'],
        parameters: [],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': { schema: { type: 'array', items: { type: 'object' } } },
            },
          },
        },
      },
      post: {
        operationId: 'createPet',
        tags: ['pets'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          '201': {
            description: 'created',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
});

// Pre-load templates once — genMocks calls prepareOperations which needs the
// template engine initialised. We use xior as the baseline L1.
beforeAll(() => {
  loadAllTemplateFiles(normalizeTemplate('xior'));
});

// ─── Helper to build options for a given template ───────────────────────────

function opts(template: string | string[], fw: 'vitest' | 'jest' = 'vitest') {
  return getClientOptions({
    template: normalizeTemplate(template as any) as any,
    testingFramework: fw,
  });
}

// ─── ng1 guard ───────────────────────────────────────────────────────────────

describe('ng1 template', () => {
  test('throws a clear error when mocks are requested for ng1', () => {
    expect(() => generateMocks(SIMPLE_SPEC, opts('ng1'), './api')).toThrow(
      'Mock generation is not supported for the "ng1" template'
    );
  });
});

// ─── L1-only (xior) ─────────────────────────────────────────────────────────

describe('xior template — vitest', () => {
  let output: string;

  beforeAll(() => {
    output = generateMocks(SIMPLE_SPEC, opts('xior', 'vitest'), './api');
  });

  test('imports vi from vitest', () => {
    expect(output).toContain("import { vi } from 'vitest'");
  });

  test('imports realApi as namespace', () => {
    expect(output).toContain("import * as realApi from './api'");
  });

  test('exports createClientMocks function', () => {
    expect(output).toContain('export function createClientMocks()');
  });

  test('exports ClientMocks type', () => {
    expect(output).toContain('export type ClientMocks = ReturnType<typeof createClientMocks>');
  });

  test('uses vi.spyOn for client methods', () => {
    expect(output).toContain('vi.spyOn(realApi.petsClient,');
  });

  test('sets mockReturnValue(undefined as any) on each spy', () => {
    expect(output).toContain('.mockReturnValue(undefined as any)');
  });

  test('does NOT emit createApiHookMocks', () => {
    expect(output).not.toContain('createApiHookMocks');
  });

  test('does NOT emit SWR helpers', () => {
    expect(output).not.toContain('defaultSWRReturn');
  });

  test('does NOT emit TSQ helpers', () => {
    expect(output).not.toContain('defaultQueryReturn');
  });
});

describe('xior template — jest', () => {
  let output: string;

  beforeAll(() => {
    output = generateMocks(SIMPLE_SPEC, opts('xior', 'jest'), './api');
  });

  test('imports jest from @jest/globals', () => {
    expect(output).toContain("import { jest } from '@jest/globals'");
  });

  test('uses jest.spyOn for client methods', () => {
    expect(output).toContain('jest.spyOn(realApi.petsClient,');
  });
});

// ─── SWR + axios ─────────────────────────────────────────────────────────────

describe('swr+axios template — vitest', () => {
  let output: string;

  beforeAll(() => {
    loadAllTemplateFiles(normalizeTemplate(['swr', 'axios'] as any));
    output = generateMocks(SIMPLE_SPEC, opts(['swr', 'axios'], 'vitest'), './api');
  });

  test('imports vi from vitest', () => {
    expect(output).toContain("import { vi } from 'vitest'");
  });

  test('emits defaultSWRReturn const', () => {
    expect(output).toContain('const defaultSWRReturn');
    expect(output).toContain('isValidating: false');
  });

  test('emits defaultSWRMutationReturn const', () => {
    expect(output).toContain('const defaultSWRMutationReturn');
    expect(output).toContain('isMutating: false');
  });

  test('emits withMockSWR helper', () => {
    expect(output).toContain('function withMockSWR');
    expect(output).toContain('mockSWR(');
  });

  test('emits withMockSWRMutation helper', () => {
    expect(output).toContain('function withMockSWRMutation');
    expect(output).toContain('mockSWRMutation(');
  });

  test('exports createClientMocks with spyOn stubs', () => {
    expect(output).toContain('export function createClientMocks()');
    expect(output).toContain('vi.spyOn(realApi.petsClient,');
  });

  test('exports createApiHookMocks', () => {
    expect(output).toContain('export function createApiHookMocks()');
  });

  test('exports ApiHookMocks type', () => {
    expect(output).toContain('export type ApiHookMocks = ReturnType<typeof createApiHookMocks>');
  });

  test('GET operation appears in queries with withMockSWR wrapper', () => {
    expect(output).toContain("withMockSWR(vi.spyOn(realApi.pets.queries, 'useListPets')");
  });

  test('POST operation appears in mutations with withMockSWRMutation wrapper', () => {
    expect(output).toContain(
      "withMockSWRMutation(vi.spyOn(realApi.pets.mutations, 'useCreatePet')"
    );
  });
});

describe('swr+axios template — jest', () => {
  let output: string;

  beforeAll(() => {
    loadAllTemplateFiles(normalizeTemplate(['swr', 'axios'] as any));
    output = generateMocks(SIMPLE_SPEC, opts(['swr', 'axios'], 'jest'), './api');
  });

  test('imports jest from @jest/globals', () => {
    expect(output).toContain("import { jest } from '@jest/globals'");
  });

  test('helpers reference jest.spyOn type', () => {
    expect(output).toContain('ReturnType<typeof jest.spyOn>');
  });

  test('uses jest.fn() in default return objects', () => {
    expect(output).toContain('mutate: jest.fn()');
  });

  test('uses jest.spyOn for hook stubs', () => {
    expect(output).toContain("jest.spyOn(realApi.pets.queries, 'useListPets')");
  });
});

// ─── TSQ + xior ──────────────────────────────────────────────────────────────

describe('tsq+xior template — vitest', () => {
  let output: string;

  beforeAll(() => {
    loadAllTemplateFiles(normalizeTemplate(['tsq', 'xior'] as any));
    output = generateMocks(SIMPLE_SPEC, opts(['tsq', 'xior'], 'vitest'), './api');
  });

  test('emits defaultQueryReturn with isFetching and isPending', () => {
    expect(output).toContain('const defaultQueryReturn');
    expect(output).toContain('isFetching: false');
    expect(output).toContain('isPending: false');
  });

  test('emits defaultMutationReturn with mutateAsync and reset', () => {
    expect(output).toContain('const defaultMutationReturn');
    expect(output).toContain('mutateAsync:');
    expect(output).toContain('reset:');
  });

  test('emits withMockQuery helper', () => {
    expect(output).toContain('function withMockQuery');
    expect(output).toContain('mockQuery(');
  });

  test('emits withMockMutation helper', () => {
    expect(output).toContain('function withMockMutation');
    expect(output).toContain('mockMutation(');
  });

  test('does NOT emit SWR helpers', () => {
    expect(output).not.toContain('defaultSWRReturn');
    expect(output).not.toContain('withMockSWR');
  });

  test('GET operation uses withMockQuery wrapper', () => {
    expect(output).toContain("withMockQuery(vi.spyOn(realApi.pets.queries, 'useListPets')");
  });

  test('POST operation uses withMockMutation wrapper', () => {
    expect(output).toContain("withMockMutation(vi.spyOn(realApi.pets.mutations, 'useCreatePet')");
  });

  test('exports ApiHookMocks type', () => {
    expect(output).toContain('export type ApiHookMocks = ReturnType<typeof createApiHookMocks>');
  });
});

// ─── ng2 ─────────────────────────────────────────────────────────────────────

describe('ng2 template — vitest', () => {
  let output: string;

  beforeAll(() => {
    loadAllTemplateFiles(normalizeTemplate('ng2'));
    output = generateMocks(SIMPLE_SPEC, opts('ng2', 'vitest'), './api');
  });

  test('imports vi from vitest', () => {
    expect(output).toContain("import { vi } from 'vitest'");
  });

  test('uses type-only import of service classes', () => {
    expect(output).toContain("import type { PetsService } from './api'");
  });

  test('does NOT emit a value import of realApi', () => {
    expect(output).not.toContain('import * as realApi');
  });

  test('emits MockedService<T> utility type', () => {
    expect(output).toContain('export type MockedService<T>');
  });

  test('exports createClientMocks function', () => {
    expect(output).toContain('export function createClientMocks()');
  });

  test('uses typed vi.fn<typeof Service.prototype.method>()', () => {
    expect(output).toContain('vi.fn<typeof PetsService.prototype.listPets>()');
    expect(output).toContain('vi.fn<typeof PetsService.prototype.createPet>()');
  });

  test('applies satisfies MockedService<ServiceName> on each client block', () => {
    expect(output).toContain('} satisfies MockedService<PetsService>');
  });

  test('exports ClientMocks type', () => {
    expect(output).toContain('export type ClientMocks = ReturnType<typeof createClientMocks>');
  });

  test('does NOT emit createApiHookMocks', () => {
    expect(output).not.toContain('createApiHookMocks');
  });
});

describe('ng2 template — jest', () => {
  let output: string;

  beforeAll(() => {
    loadAllTemplateFiles(normalizeTemplate('ng2'));
    output = generateMocks(SIMPLE_SPEC, opts('ng2', 'jest'), './api');
  });

  test('uses bare jest.fn() without type parameter', () => {
    expect(output).toContain('jest.fn()');
    expect(output).not.toContain('jest.fn<typeof');
  });

  test('does NOT use satisfies (no typed fn, so constraint is less useful)', () => {
    expect(output).not.toContain('satisfies MockedService');
  });
});

// ─── relativeApiImport is forwarded correctly ─────────────────────────────────

describe('relativeApiImport propagation', () => {
  test('custom import path appears verbatim in the output', () => {
    const output = generateMocks(SIMPLE_SPEC, opts('xior', 'vitest'), '../generated/client');
    expect(output).toContain("import * as realApi from '../generated/client'");
  });

  test('ng2 type import also uses the custom path', () => {
    loadAllTemplateFiles(normalizeTemplate('ng2'));
    const output = generateMocks(SIMPLE_SPEC, opts('ng2', 'vitest'), '../generated/client');
    expect(output).toContain("import type { PetsService } from '../generated/client'");
  });
});
