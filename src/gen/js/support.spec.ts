import { expect } from 'chai';
import type { OpenAPIV3 as OA3 } from 'openapi-types';
import type { ClientOptions } from '../../types';
import { getParameterType, getTypeFromSchema } from './support';
import { getClientOptions } from '../../utils';

describe('getParameterType', () => {
  describe('empty cases', () => {
    type TestCase = {
      param?: OA3.ParameterObject | OA3.MediaTypeObject | null | any;
      options: Partial<ClientOptions>;
      expected: string;
    };

    const testCases: TestCase[] = [
      { param: null, options: { preferAny: true }, expected: 'any' },
      { param: undefined, options: {}, expected: 'unknown' },
      { param: {}, options: {}, expected: 'unknown' },
      { param: [], options: {}, expected: 'unknown' },
      { param: [], options: { preferAny: true }, expected: 'any' },
      {
        param: { name: 'a', in: 'query' } as OA3.ParameterObject,
        options: {},
        expected: 'unknown',
      },
    ];

    for (const { param, options, expected } of testCases) {
      it(`should process ${param} correctly`, async () => {
        const res = getParameterType(param, options);

        expect(res).to.be.equal(expected);
      });
    }
  });

  it('file', async () => {
    const param: OA3.ParameterObject = {
      name: 'attachment',
      in: 'body',
      required: false,
      schema: {
        type: 'string',
        format: 'binary',
      },
    };
    const options = {};

    const res = getParameterType(param, options);

    expect(res).to.be.equal('File');
  });

  it('array with a reference type', async () => {
    const param: OA3.ParameterObject = {
      name: 'items',
      in: 'query',
      schema: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Item',
        },
      },
    };

    const res = getParameterType(param, {});

    expect(res).to.be.equal('Item[]');
  });

  it('reference #1', async () => {
    const param: OA3.ParameterObject = {
      name: 'something',
      in: 'body',
      required: false,
      schema: {
        $ref: '#/components/schemas/SomeItem',
      },
    };
    const options = {};

    const res = getParameterType(param, options);

    expect(res).to.be.equal('SomeItem');
  });

  it('inline enums', async () => {
    const param: OA3.ParameterObject = {
      name: 'Roles',
      in: 'query',
      schema: {
        type: 'array',
        items: {
          enum: ['Admin', 'User', 'Guest'],
          type: 'string',
        },
      },
    };
    const options = {};

    const res = getParameterType(param, options);

    expect(res).to.be.equal(`("Admin" | "User" | "Guest")[]`);
  });

  describe('responses', () => {
    it('string', async () => {
      const param: OA3.ParameterObject = {
        name: 'title',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
        },
      };
      const options = {};

      const res = getParameterType(param, options);

      expect(res).to.be.equal('string');
    });

    it('date', async () => {
      const param: OA3.ParameterObject = {
        name: 'dateFrom',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          format: 'date-time',
        },
      };
      const options = {};

      const res = getParameterType(param, options);

      expect(res).to.be.equal('Date');
    });

    it('date with dateFormatter = string', async () => {
      const param: OA3.ParameterObject = {
        name: 'dateFrom',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          format: 'date-time',
        },
      };
      const options = { dateFormat: 'string' } as ClientOptions;

      const res = getParameterType(param, options);

      expect(res).to.be.equal('string');
    });

    it('array > reference', async () => {
      const param: OA3.ParameterObject = {
        name: 'items',
        in: 'query',
        schema: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Item',
          },
        },
      };
      const options = {};

      const res = getParameterType(param, options);

      expect(res).to.be.equal('Item[]');
    });
  });
});

describe('getTypeFromSchema', () => {
  const opts = getClientOptions();

  describe('arrays', () => {
    type TestCase = {
      schema: OA3.SchemaObject;
      expected: string;
    };
    const testCases: TestCase[] = [
      { schema: { type: 'array', items: {} }, expected: 'unknown[]' },
      { schema: { type: 'array', items: null }, expected: 'unknown[]' },
      {
        schema: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
        expected: 'Item[]',
      },
      { schema: { type: 'array', items: { type: 'string' } }, expected: 'string[]' },
      { schema: { type: 'array', items: { type: 'number' } }, expected: 'number[]' },
      { schema: { type: 'array', items: { type: 'boolean' } }, expected: 'boolean[]' },
      { schema: { type: 'array', items: { type: 'object' } }, expected: 'unknown[]' },
    ];

    for (const { schema, expected } of testCases) {
      it(`should process ${schema} correctly`, async () => {
        const res = getTypeFromSchema(schema, opts);

        expect(res).to.be.equal(expected);
      });
    }

    it('should process array of objects correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'array',
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            name: { type: 'string', description: 'Name of the item' },
            id: { type: 'number' },
          },
        },
      };
      const res = getTypeFromSchema(schema, opts);

      expect(res).to.equalWI(`{
        name?: string;
        id: number;
      }[]`);
    });
  });

  describe('objects', () => {
    it('should process deep objects correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'object',
        required: ['id'],
        properties: {
          name: { type: 'string', description: 'Name of the item' },
          id: { type: 'number' },
          evenDeeper: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
          },
        },
      };
      const res = getTypeFromSchema(schema, opts);

      expect(res).to.equalWI(`{
        name?: string;
        id: number;

        evenDeeper?: {
          foo?: string;
        };
      }`);
    });
  });

  describe('enums', () => {
    it('should process string enums correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'string',
        enum: ['Admin', 'User', 'Guest'],
      };
      const res = getTypeFromSchema(schema, opts);

      expect(res).to.equalWI(`("Admin" | "User" | "Guest")`);
    });

    it('should process numeric enums correctly', () => {
      const schema: OA3.SchemaObject = {
        type: 'number',
        enum: [1, 2, 3],
      };
      const res = getTypeFromSchema(schema, opts);

      expect(res).to.equalWI('(1 | 2 | 3)');
    });
  });

  describe('basic types', () => {
    type TestCase = {
      schema: OA3.SchemaObject;
      expected: string;
    };

    const testCases: TestCase[] = [
      { schema: { type: 'string' }, expected: 'string' },
      { schema: { type: 'string', format: 'date-time' }, expected: 'Date' },
      { schema: { type: 'string', format: 'date' }, expected: 'Date' },
      { schema: { type: 'string', format: 'binary' }, expected: 'File' },
      { schema: { type: 'number' }, expected: 'number' },
      { schema: { type: 'integer' }, expected: 'number' },
      { schema: { type: 'boolean' }, expected: 'boolean' },
      { schema: null, expected: 'unknown' },
      { schema: undefined, expected: 'unknown' },
      { schema: {}, expected: 'unknown' },
    ];

    for (const { schema, expected } of testCases) {
      it(`should process ${schema} correctly`, async () => {
        const res = getTypeFromSchema(schema, opts);

        expect(res).to.be.equal(expected);
      });
    }
  });
});
