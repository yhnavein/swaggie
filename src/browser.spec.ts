import { describe, expect, test } from 'bun:test';

import { runCodeGenerator } from './browser';

describe('browser entrypoint', () => {
  test('uses bundled templates for code generation', async () => {
    const [code] = await runCodeGenerator({
      src: {
        openapi: '3.0.0',
        info: { title: 'test', version: '1.0.0' },
        paths: {
          '/health': {
            get: {
              tags: ['Health'],
              operationId: 'getHealth',
              responses: {
                '200': {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      template: 'axios',
    });

    expect(code).toContain('export const healthClient');
    expect(code).toContain('getHealth(');
  });
});
