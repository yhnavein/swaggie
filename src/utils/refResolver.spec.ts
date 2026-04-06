import path from 'node:path';
import { describe, expect, test } from 'bun:test';

import { resolveExternalFileRefs } from './refResolver';

describe('resolveExternalFileRefs', () => {
  test('should generate incremented alias when hash-based collision also exists', async () => {
    const rootSpecPath = path.join(__dirname, '../../test/external-refs/main-collision.yml');
    const externalFilePath = path.resolve(path.dirname(rootSpecPath), './components/collision.yml');
    const hash = shortHash(externalFilePath);
    const firstAlias = `User__${hash}`;

    const spec: any = {
      openapi: '3.0.0',
      info: { title: 'Alias collision test', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': {
                    schema: {
                      $ref: './components/collision.yml#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              local: {
                type: 'boolean',
              },
            },
          },
          [firstAlias]: {
            type: 'object',
            properties: {
              reserved: {
                type: 'boolean',
              },
            },
          },
        },
      },
    };

    const resolved = (await resolveExternalFileRefs(spec, rootSpecPath)) as any;
    const schemaRef =
      resolved.paths['/users'].get.responses['200'].content['application/json'].schema.$ref;

    expect(schemaRef).toBe(`#/components/schemas/${firstAlias}_2`);
    expect(resolved.components.schemas[`${firstAlias}_2`]).toBeDefined();
  });
});

function shortHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }

  return hash.toString(36);
}
