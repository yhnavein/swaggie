import { test, describe, beforeEach, expect, spyOn } from 'bun:test';
import { loadSpecDocument } from './documentLoader';
import { mockFetchWithContent, mockFetchWithFile } from '../../test/test.utils';

// URLs are not used to fetch anything. We are mocking the global fetch function
const petstore3 = {
  json: 'https://petstore.swagger.io/v3/swagger.json',
  yaml: 'https://petstore.swagger.io/v3/swagger.yaml',
};

describe('loadSpecDocument', () => {
  let mockFetch: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Spy on the global fetch function
    mockFetch = spyOn(global, 'fetch');
  });

  test('should resolve a JSON spec from url', async () => {
    await mockFetchWithFile(mockFetch, petstore3.json, 'petstore-v3.json');

    const spec = await loadSpecDocument(petstore3.json);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a YAML spec from url', async () => {
    await mockFetchWithFile(mockFetch, petstore3.yaml, 'petstore-v3.yml');

    const spec = await loadSpecDocument(petstore3.yaml);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a YAML spec from an extensionless url', async () => {
    const urlWithoutExtension = petstore3.yaml.replace('.yaml', '');
    await mockFetchWithFile(mockFetch, urlWithoutExtension, 'petstore-v3.yml');

    const spec = await loadSpecDocument(urlWithoutExtension);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a JSON spec from an extensionless url', async () => {
    const urlWithoutExtension = petstore3.json.replace('.json', '');
    await mockFetchWithFile(mockFetch, urlWithoutExtension, 'petstore-v3.json');

    const spec = await loadSpecDocument(urlWithoutExtension);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a YAML spec from local file', async () => {
    const path = `${__dirname}/../../test/petstore-v3.yml`;
    const spec = await loadSpecDocument(path);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should handle nonexistent local file', async () => {
    const path = `${__dirname}/../../test/nonexistent.yml`;

    try {
      await loadSpecDocument(path);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message.includes('ENOENT') || e.message.includes('no such file')).toBe(true);
    }
  });

  test('should handle malformed JSON file', async () => {
    const malformedUrl = 'https://example.com/malformed.json';
    mockFetchWithContent(mockFetch, malformedUrl, '{"invalid": json}');

    try {
      await loadSpecDocument(malformedUrl);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e instanceof SyntaxError).toBe(true);
    }
  });

  test('should handle passing an object directly', async () => {
    const mockSpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    const spec = await loadSpecDocument(mockSpec);
    expect(spec).toEqual(mockSpec);
  });
});
