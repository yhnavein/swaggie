import path from 'node:path';
import { expect, Mock } from 'bun:test';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import type { AppOptions, ClientOptions } from '../src/types';
import { resolveOptions } from '../src/swagger';

/**
 * Returns a valid OpenAPI 3.0 document with the minimal required fields.
 * And it allows to easily override any of the fields.
 */
export function getDocument(document: Partial<OA3.Document> = {}): OA3.Document {
  return {
    openapi: '3.0.0',
    paths: {},
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    components: {},

    ...document,
  };
}

/**
 * Returns a fully resolved AppOptions object suitable for passing to internal gen functions.
 * Accepts a partial ClientOptions for easy overrides in tests.
 */
export function getClientOptions(opts: Partial<ClientOptions> = {}): AppOptions {
  return resolveOptions({
    src: 'http://example.com/swagger.json',
    out: 'output.ts',
    template: 'xior',
    queryParamsSerialization: {
      allowDots: true,
      arrayFormat: 'repeat',
    },
    ...opts,
  });
}

/**
 * Helper function to mock fetch for a specific URL with file content
 */
export async function mockFetchWithFile(mockFetch: Mock<any>, url: string, filename: string) {
  const fileContent = await Bun.file(path.join(__dirname, '../test', filename)).text();

  mockFetch.mockImplementation(async (requestUrl: string) => {
    if (requestUrl === url) {
      return new Response(fileContent, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected request to: ${requestUrl}`);
  });
}

/**
 * Helper function to mock fetch with direct content
 */
export function mockFetchWithContent(
  mockFetch: Mock<any>,
  url: string,
  content: string,
  status = 200
) {
  mockFetch.mockImplementation(async (requestUrl: string) => {
    if (requestUrl === url) {
      return new Response(content, {
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected request to: ${requestUrl}`);
  });
}

// Helper function to compare strings ignoring whitespace (equivalent to Chai's equalWI)
export function assertEqualIgnoringWhitespace(actual: string, expected: string) {
  const normalize = (str: string) => str.replace(/\s+/g, '').trim();
  expect(normalize(actual)).toBe(normalize(expected));
}
