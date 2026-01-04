import { test, describe, expect } from 'bun:test';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { findAllUsedRefs } from './refsHelper';
import { getClientOptions } from '../../test/test.utils';

const defaultOptions = getClientOptions();
const skipDeprecatedOptions = getClientOptions({ skipDeprecated: true });

describe('refsHelper - findAllUsedRefs', () => {
  test('should handle empty spec with no components', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(0);
  });

  test('should handle spec with no schemas', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        parameters: {
          TestParam: {
            name: 'test',
            in: 'query',
            schema: { type: 'string' },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(0);
  });

  test('should handle circular dependencies without infinite loop', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/NodeA' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          NodeA: {
            type: 'object',
            properties: {
              child: { $ref: '#/components/schemas/NodeB' },
            },
          },
          NodeB: {
            type: 'object',
            properties: {
              parent: { $ref: '#/components/schemas/NodeA' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(2);
    expect(refs.has('NodeA')).toBe(true);
    expect(refs.has('NodeB')).toBe(true);
  });

  test('should handle deep nested schema references', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Level1' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Level1: {
            type: 'object',
            properties: {
              nested: { $ref: '#/components/schemas/Level2' },
            },
          },
          Level2: {
            type: 'object',
            properties: {
              deepNested: { $ref: '#/components/schemas/Level3' },
            },
          },
          Level3: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
          UnusedSchema: {
            type: 'object',
            properties: {
              unused: { type: 'string' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(3);
    expect(refs.has('Level1')).toBe(true);
    expect(refs.has('Level2')).toBe(true);
    expect(refs.has('Level3')).toBe(true);
    expect(refs.has('UnusedSchema')).toBe(false);
  });

  test('should handle deprecated schemas when skipDeprecated is true', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            deprecated: true,
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/DeprecatedSchema' },
                  },
                },
              },
            },
          },
        },
        '/active': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ActiveSchema' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          DeprecatedSchema: {
            type: 'object',
            deprecated: true,
            properties: {
              ref: { $ref: '#/components/schemas/ReferencedByDeprecated' },
            },
          },
          ReferencedByDeprecated: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
          ActiveSchema: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, skipDeprecatedOptions, refs);

    expect(refs.size).toBe(1);
    expect(refs.has('ActiveSchema')).toBe(true);
    expect(refs.has('DeprecatedSchema')).toBe(false);
    expect(refs.has('ReferencedByDeprecated')).toBe(false);
  });

  test('should handle schema with deprecated flag when skipDeprecated is true', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ValidSchema' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          ValidSchema: {
            type: 'object',
            properties: {
              deprecatedRef: { $ref: '#/components/schemas/DeprecatedSchema' },
              validRef: { $ref: '#/components/schemas/AnotherValidSchema' },
            },
          },
          DeprecatedSchema: {
            type: 'object',
            deprecated: true,
            properties: {
              shouldNotBeIncluded: { $ref: '#/components/schemas/NestedDeprecated' },
            },
          },
          NestedDeprecated: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
          AnotherValidSchema: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, skipDeprecatedOptions, refs);

    expect(refs.size).toBe(3);
    expect(refs.has('ValidSchema')).toBe(true);
    expect(refs.has('DeprecatedSchema')).toBe(true); // Should be included as it's directly referenced
    expect(refs.has('AnotherValidSchema')).toBe(true);
    expect(refs.has('NestedDeprecated')).toBe(false); // Should not be included as DeprecatedSchema's deps are skipped
  });

  test('should handle malformed $ref strings gracefully', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        // Malformed refs that should be ignored
                        invalidRef1: { $ref: 'invalid-ref' },
                        invalidRef2: { $ref: '#/components/other/Something' },
                        invalidRef3: { $ref: '#/components/schemas/' }, // Empty name
                        validRef: { $ref: '#/components/schemas/ValidSchema' },
                      },
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
          ValidSchema: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(1);
    expect(refs.has('ValidSchema')).toBe(true);
  });

  test('should handle references in allOf/oneOf/anyOf structures', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CompositeSchema' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          CompositeSchema: {
            allOf: [
              { $ref: '#/components/schemas/BaseSchema' },
              {
                type: 'object',
                properties: {
                  oneOfProp: {
                    oneOf: [
                      { $ref: '#/components/schemas/OptionA' },
                      { $ref: '#/components/schemas/OptionB' },
                    ],
                  },
                  anyOfProp: {
                    anyOf: [
                      { $ref: '#/components/schemas/AnyA' },
                      { $ref: '#/components/schemas/AnyB' },
                    ],
                  },
                },
              },
            ],
          },
          BaseSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
          OptionA: {
            type: 'object',
            properties: {
              typeA: { type: 'string' },
            },
          },
          OptionB: {
            type: 'object',
            properties: {
              typeB: { type: 'number' },
            },
          },
          AnyA: {
            type: 'object',
            properties: {
              anyA: { type: 'boolean' },
            },
          },
          AnyB: {
            type: 'object',
            properties: {
              anyB: { type: 'array', items: { type: 'string' } },
            },
          },
          UnusedSchema: {
            type: 'object',
            properties: {
              unused: { type: 'string' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(6);
    expect(refs.has('CompositeSchema')).toBe(true);
    expect(refs.has('BaseSchema')).toBe(true);
    expect(refs.has('OptionA')).toBe(true);
    expect(refs.has('OptionB')).toBe(true);
    expect(refs.has('AnyA')).toBe(true);
    expect(refs.has('AnyB')).toBe(true);
    expect(refs.has('UnusedSchema')).toBe(false);
  });

  test('should handle references in array items', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ArrayItem' },
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
          ArrayItem: {
            type: 'object',
            properties: {
              nestedArray: {
                type: 'array',
                items: { $ref: '#/components/schemas/NestedItem' },
              },
            },
          },
          NestedItem: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(2);
    expect(refs.has('ArrayItem')).toBe(true);
    expect(refs.has('NestedItem')).toBe(true);
  });

  test('should handle references in request bodies and parameters', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          post: {
            parameters: [
              {
                name: 'queryParam',
                in: 'query',
                schema: { $ref: '#/components/schemas/QueryParamSchema' },
              },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RequestSchema' },
                },
              },
            },
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ResponseSchema' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          QueryParamSchema: {
            type: 'object',
            properties: {
              filter: { type: 'string' },
            },
          },
          RequestSchema: {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/RequestData' },
            },
          },
          RequestData: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
          ResponseSchema: {
            type: 'object',
            properties: {
              result: { $ref: '#/components/schemas/ResponseData' },
            },
          },
          ResponseData: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(5);
    expect(refs.has('QueryParamSchema')).toBe(true);
    expect(refs.has('RequestSchema')).toBe(true);
    expect(refs.has('RequestData')).toBe(true);
    expect(refs.has('ResponseSchema')).toBe(true);
    expect(refs.has('ResponseData')).toBe(true);
  });

  test('should handle null and undefined values gracefully', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        nullProp: null,
                        undefinedProp: undefined,
                        validRef: { $ref: '#/components/schemas/ValidSchema' },
                      },
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
          ValidSchema: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              nullNested: null,
              undefinedNested: undefined,
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(1);
    expect(refs.has('ValidSchema')).toBe(true);
  });

  test('should not include orphaned schemas that only reference each other', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
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
              value: { type: 'string' },
            },
          },
          OrphanA: {
            type: 'object',
            properties: {
              ref: { $ref: '#/components/schemas/OrphanB' },
            },
          },
          OrphanB: {
            type: 'object',
            properties: {
              ref: { $ref: '#/components/schemas/OrphanC' },
            },
          },
          OrphanC: {
            type: 'object',
            properties: {
              backRef: { $ref: '#/components/schemas/OrphanA' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(1);
    expect(refs.has('UsedSchema')).toBe(true);
    expect(refs.has('OrphanA')).toBe(false);
    expect(refs.has('OrphanB')).toBe(false);
    expect(refs.has('OrphanC')).toBe(false);
  });

  test('should handle missing schema reference gracefully', () => {
    const spec: OA3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/NonExistentSchema' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          ExistingSchema: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
        },
      },
    };
    const refs = new Set<string>();

    findAllUsedRefs(spec, defaultOptions, refs);

    expect(refs.size).toBe(0);
    expect(refs.has('NonExistentSchema')).toBe(false);
    expect(refs.has('ExistingSchema')).toBe(false);
  });
});
