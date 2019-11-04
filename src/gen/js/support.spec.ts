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

    expect(res).toBe('module:types.ActivityFilter');
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

      expect(res).toBe('module:types.Items[]');
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
    const inTypesModule = false;
    const options = {
      preferAny: true,
    } as any;

    const res = getTSParamType(param, inTypesModule, options);

    expect(res).toBe('any');
  });

  it('empty #2', async () => {
    const param = null;
    const inTypesModule = false;
    const options = {} as any;

    const res = getTSParamType(param, inTypesModule, options);

    expect(res).toBe('unknown');
  });

  it('empty #3', async () => {
    const param = null;
    const inTypesModule = true;
    const options = {} as any;

    const res = getTSParamType(param, inTypesModule, options);

    expect(res).toBe('unknown');
  });

  it('empty #3', async () => {
    const param = [];
    const inTypesModule = false;
    const options = {} as any;

    const res = getTSParamType(param, inTypesModule, options);

    expect(res).toBe('unknown');
  });

  describe('responses', () => {
    it('array', async () => {
      const param = {
        uniqueItems: false,
        type: 'array',
        items: {
          $ref: '#/definitions/Item',
        },
      };
      const inTypesModule = true;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('types.Item[]');
    });

    it('reference #0', async () => {
      const param = {
        $ref: '#/definitions/SomeItem',
      };
      const inTypesModule = true;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('types.SomeItem');
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
      const inTypesModule = true;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('types.SomeItem');
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
      const inTypesModule = false;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('SomeItem');
    });

    it('generics', async () => {
      const param = {
        name: 'query',
        in: 'body',
        required: false,
        schema: {
          $ref: '#/definitions/PagingAndSortingParameters[Item]',
        },
      };
      const inTypesModule = false;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('PagingAndSortingParameters<Item>');
    });

    it('string', async () => {
      const param = {
        name: 'title',
        in: 'query',
        required: false,
        type: 'string',
      };
      const inTypesModule = false;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

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
      const inTypesModule = false;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('Date');
    });

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
      const inTypesModule = false;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('number');
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
      const inTypesModule = false;
      const options = {} as any;

      const res = getTSParamType(param, inTypesModule, options);

      expect(res).toBe('Item[]');
    });
  });
});
