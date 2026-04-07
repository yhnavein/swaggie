import { test, describe, expect } from 'bun:test';

import { deriveRelativeImport } from './fileUtils';

describe('deriveRelativeImport', () => {
  test('same directory — emits ./ prefix', () => {
    expect(deriveRelativeImport('src/api.mock.ts', 'src/api.ts')).toBe('./api');
  });

  test('mock one level deeper than client', () => {
    expect(deriveRelativeImport('src/__mocks__/api.ts', 'src/api.ts')).toBe('../api');
  });

  test('mock in nested __mocks__, client in subdirectory', () => {
    expect(deriveRelativeImport('src/__mocks__/api.ts', 'src/generated/api.ts')).toBe(
      '../generated/api'
    );
  });

  test('mock and client in completely different trees', () => {
    expect(deriveRelativeImport('tests/mocks/api.ts', 'src/api/client.ts')).toBe(
      '../../src/api/client'
    );
  });

  test('strips .ts extension', () => {
    const result = deriveRelativeImport('src/foo.mock.ts', 'src/foo.ts');
    expect(result.endsWith('.ts')).toBe(false);
  });

  test('strips .js extension', () => {
    const result = deriveRelativeImport('src/foo.mock.js', 'src/foo.js');
    expect(result.endsWith('.js')).toBe(false);
  });

  test('strips .tsx extension', () => {
    const result = deriveRelativeImport('src/foo.mock.tsx', 'src/foo.tsx');
    expect(result.endsWith('.tsx')).toBe(false);
  });

  test('result always starts with ./ or ../', () => {
    const result = deriveRelativeImport('src/api.mock.ts', 'src/api.ts');
    expect(result.startsWith('./') || result.startsWith('../')).toBe(true);
  });

  test('index file in subdirectory', () => {
    expect(deriveRelativeImport('src/api/index.mock.ts', 'src/api/index.ts')).toBe('./index');
  });
});
