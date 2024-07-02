import type { OpenAPIV3 as OA3 } from 'openapi-types';
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
    ...opts,
  };
}
