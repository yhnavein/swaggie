import fs from 'node:fs';
import path from 'node:path';
import type { OpenAPIV3 as OA3 } from 'openapi-types';
import type { MockAgent } from 'undici';

import type { ClientOptions } from '../types';

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
 * Returns a valid ClientOptions object with the minimal required fields.
 * And it allows to easily override any of the fields.
 */
export function getClientOptions(opts: Partial<ClientOptions> = {}): ClientOptions {
  return {
    src: 'http://example.com/swagger.json',
    out: 'output.ts',
    template: 'xior',
    queryParamsSerialization: {
      allowDots: true,
      arrayFormat: 'repeat',
    },
    ...opts,
  };
}

/**
 * Utility that will set up a mock response for a given URL
 * @param mockAgent Agent that will be used to intercept the request
 * @param url Full URL to intercept
 * @param responseFileName Filename that contains the response. It will be loaded from the test folder
 */
export function mockRequest(mockAgent: MockAgent, url: string, responseFileName: string) {
  const urlObject = new URL(url);
  const mockPool = mockAgent.get(urlObject.origin);

  const response = fs.readFileSync(path.join(__dirname, '..', '..', 'test', responseFileName), {
    encoding: 'utf-8',
  });

  // Set up the mock response
  mockPool
    .intercept({
      path: urlObject.pathname,
      method: 'GET',
    })
    .reply(200, response);
}
