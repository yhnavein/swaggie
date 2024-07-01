import { expect } from 'chai';
import type { OpenAPIV3 as OA3 } from 'openapi-types';
import type { ClientOptions } from '../../types';
import { getParameterType } from './support';

describe('getParameterType', () => {
  describe('empty cases', () => {
    const testCases = [
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
        const res = getParameterType(param as any, options);

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
          $ref: '#/definitions/Item',
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
        $ref: '#/definitions/SomeItem',
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
            $ref: '#/definitions/Item',
          },
        },
      };
      const options = {};

      const res = getParameterType(param, options);

      expect(res).to.be.equal('Item[]');
    });
  });
});
