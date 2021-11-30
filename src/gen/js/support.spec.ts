import { expect } from 'chai';
import { getTSParamType } from './support';

describe('getTSParamType', () => {
  it('empty #1', async () => {
    const param = null;
    const options = {
      preferAny: true,
    } as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('any');
  });

  it('empty #2', async () => {
    const param = null;
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('unknown');
  });

  it('empty #3', async () => {
    const param = null;
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('unknown');
  });

  it('empty #3', async () => {
    const param = [];
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('unknown');
  });

  it('file', async () => {
    const param = {
      name: 'attachment',
      in: 'body',
      required: false,
      type: 'file',
    };
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('File');
  });

  it('enum with x-schema', async () => {
    const param = {
      type: 'integer',
      name: 'SomeEnum',
      in: 'query',
      'x-schema': {
        $ref: '#/definitions/SomeEnum',
      },
      'x-nullable': false,
      enum: [1, 2],
    };
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('SomeEnum');
  });

  it('array', async () => {
    const param = {
      uniqueItems: false,
      type: 'array',
      items: {
        $ref: '#/definitions/Item',
      },
    };
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('Item[]');
  });

  it('reference #0', async () => {
    const param = {
      $ref: '#/definitions/SomeItem',
    };
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('SomeItem');
  });

  it('reference #1', async () => {
    const param = {
      name: 'something',
      in: 'body',
      required: false,
      schema: {
        $ref: '#/definitions/SomeItem',
      },
    };
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('SomeItem');
  });

  it('reference #2', async () => {
    const param = {
      name: 'something',
      in: 'body',
      required: false,
      schema: {
        $ref: '#/definitions/SomeItem',
      },
    };
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).to.be.equal('SomeItem');
  });

  describe('responses', () => {
    it('generics', async () => {
      const param = {
        name: 'query',
        in: 'body',
        required: false,
        schema: {
          $ref: '#/definitions/PagingAndSortingParameters[Item]',
        },
      };
      const options = {} as any;

      const res = getTSParamType(param, options);

      expect(res).to.be.equal('PagingAndSortingParameters<Item>');
    });

    it('string', async () => {
      const param = {
        name: 'title',
        in: 'query',
        required: false,
        type: 'string',
      };
      const options = {} as any;

      const res = getTSParamType(param, options);

      expect(res).to.be.equal('string');
    });

    it('date', async () => {
      const param = {
        name: 'dateFrom',
        in: 'query',
        required: false,
        type: 'string',
        format: 'date-time',
      };
      const options = {} as any;

      const res = getTSParamType(param, options);

      expect(res).to.be.equal('Date');
    });

    it('date with dateFormatter = string', async () => {
      const param = {
        name: 'dateFrom',
        in: 'query',
        required: false,
        type: 'string',
        format: 'date-time',
      };
      const options = { dateFormat: 'string' } as ClientOptions;

      const res = getTSParamType(param, options);

      expect(res).to.be.equal('string');
    });

    // Full enums are not implemented. This is to ensure that full enums won't break anything
    it('enum', async () => {
      const param = {
        name: 'documentType',
        in: 'path',
        required: true,
        type: 'integer',
        format: 'int32',
        enum: ['Active', 'Disabled'],
        fullEnum: {
          Active: 0,
          Disabled: 1,
        },
      };
      const options = {} as any;

      const res = getTSParamType(param, options);

      expect(res).to.be.equal('number');
    });

    it('array > reference', async () => {
      const param = {
        description: 'Success',
        schema: {
          uniqueItems: false,
          type: 'array',
          items: {
            $ref: '#/definitions/Item',
          },
        },
      };
      const options = {} as any;

      const res = getTSParamType(param, options);

      expect(res).to.be.equal('Item[]');
    });
  });
});
