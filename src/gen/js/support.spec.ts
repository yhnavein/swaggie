import { getDocType, getTSParamType } from './support';

describe('getDocType', () => {
  it('empty', async () => {
    const def = null;

    const res = getDocType(def);

    expect(res).toBe('object');
  });

  it('object from the #definitions', async () => {
    const def = {
      type: 'object',
      properties: {
        email: {
          type: 'string',
        },
      },
    };

    const res = getDocType(def);

    expect(res).toBe('object');
  });

  it('some reference', async () => {
    const def = {
      $ref: '#/definitions/ActivityFilter',
    };

    const res = getDocType(def);

    expect(res).toBe('module:ActivityFilter');
  });

  it('some integer', async () => {
    const def = {
      format: 'int32',
      type: 'integer',
    };

    const res = getDocType(def);

    expect(res).toBe('number');
  });

  it('some number', async () => {
    const def = {
      format: 'int32',
      type: 'number',
    };

    const res = getDocType(def);

    expect(res).toBe('number');
  });

  it('some string', async () => {
    const def = {
      type: 'string',
    };

    const res = getDocType(def);

    expect(res).toBe('string');
  });

  it('some enum', async () => {
    const def = {
      format: 'int32',
      enum: ['Available', 'Unavailable', 'NotDefined'],
      type: 'integer',
      fullEnum: {
        Available: 1,
        Unavailable: 2,
        NotDefined: 3,
      },
    };

    const res = getDocType(def);

    expect(res).toBe('number');
  });

  it('some boolean', async () => {
    const def = {
      type: 'boolean',
      readOnly: true,
    };

    const res = getDocType(def);

    expect(res).toBe('boolean');
  });

  it('some date time', async () => {
    const def = {
      format: 'date-time',
      type: 'string',
    };

    const res = getDocType(def);

    expect(res).toBe('Date');
  });

  it('some date', async () => {
    const def = {
      format: 'date',
      type: 'string',
    };

    const res = getDocType(def);

    expect(res).toBe('Date');
  });

  it('some date time with date format = string', async () => {
    const def = {
      format: 'date-time',
      type: 'string',
    };

    const options = { dateFormat: 'string' } as ClientOptions;
    const res = getDocType(def, options);

    expect(res).toBe('string');
  });

  it('some date with date format = string', async () => {
    const def = {
      format: 'date',
      type: 'string',
    };

    const options = { dateFormat: 'string' } as ClientOptions;
    const res = getDocType(def, options);

    expect(res).toBe('string');
  });

  describe('array', () => {
    it('reference', async () => {
      const def = {
        uniqueItems: false,
        type: 'array',
        items: {
          $ref: '#/definitions/Items',
        },
      };

      const res = getDocType(def);

      expect(res).toBe('module:Items[]');
    });

    it('number', async () => {
      const def = {
        uniqueItems: false,
        type: 'array',
        items: {
          format: 'int32',
          type: 'integer',
        },
      };

      const res = getDocType(def);

      expect(res).toBe('number[]');
    });

    it('date', async () => {
      const def = {
        uniqueItems: false,
        type: 'array',
        items: {
          format: 'date-time',
          type: 'string',
        },
      };

      const res = getDocType(def);

      expect(res).toBe('Date[]');
    });

    it('date with date format = string', async () => {
      const def = {
        uniqueItems: false,
        type: 'array',
        items: {
          format: 'date-time',
          type: 'string',
        },
      };

      const options = { dateFormat: 'string' } as ClientOptions;
      const res = getDocType(def, options);

      expect(res).toBe('string[]');
    });

    it('boolean', async () => {
      const def = {
        uniqueItems: false,
        type: 'array',
        items: {
          type: 'boolean',
        },
      };

      const res = getDocType(def);

      expect(res).toBe('boolean[]');
    });

    it('string', async () => {
      const def = {
        uniqueItems: false,
        type: 'array',
        items: {
          type: 'string',
        },
      };

      const res = getDocType(def);

      expect(res).toBe('string[]');
    });
  });
});

describe('getTSParamType', () => {
  it('empty #1', async () => {
    const param = null;
    const options = {
      preferAny: true,
    } as any;

    const res = getTSParamType(param, options);

    expect(res).toBe('any');
  });

  it('empty #2', async () => {
    const param = null;
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).toBe('unknown');
  });

  it('empty #3', async () => {
    const param = null;
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).toBe('unknown');
  });

  it('empty #3', async () => {
    const param = [];
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).toBe('unknown');
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

    expect(res).toBe('File');
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

    expect(res).toBe('Item[]');
  });

  it('reference #0', async () => {
    const param = {
      $ref: '#/definitions/SomeItem',
    };
    const options = {} as any;

    const res = getTSParamType(param, options);

    expect(res).toBe('SomeItem');
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

    expect(res).toBe('SomeItem');
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

    expect(res).toBe('SomeItem');
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

      expect(res).toBe('PagingAndSortingParameters<Item>');
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

      expect(res).toBe('string');
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

      expect(res).toBe('Date');
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

      expect(res).toBe('string');
    });

    // TODO: Implement support for extended enums
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

      expect(res).toBe('Active|Disabled');
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

      expect(res).toBe('Item[]');
    });
  });
});
