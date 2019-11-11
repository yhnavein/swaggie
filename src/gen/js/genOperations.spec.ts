import { sortBy } from 'lodash';
import { prepareOperations } from './genOperations';

describe('prepareOperations', () => {
  it(`operation's content type should be put in header`, () => {
    const ops = [
      {
        id: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: [],
        group: null,
        accepts: ['application/json'],
        contentTypes: ['application/x-www-form-urlencoded'],
      },
    ] as ApiOperation[];

    const res = prepareOperations(ops, {} as any);

    expect(res).toBeDefined();
    expect(res[0].headers).toMatchObject([
      {
        name: 'contentType',
        originalName: 'Content-Type',
        type: 'string',
        optional: false,
      },
    ]);
  });

  it(`operation's empty header list should be handled correctly`, () => {
    const ops = [
      {
        id: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: [],
        group: null,
        accepts: ['application/json'],
        contentTypes: [],
      },
    ] as ApiOperation[];

    const res = prepareOperations(ops, {} as any);

    expect(res).toBeDefined();
    expect(res[0].headers).toMatchObject([]);
  });

  it(`operation's content type should be put in header + more headers in parameters`, () => {
    const ops = [
      {
        id: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [
          {
            name: 'Some-Other',
            in: 'header',
            description: '',
            required: true,
            allowEmptyValue: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: [],
        group: null,
        accepts: ['application/json'],
        contentTypes: ['application/x-www-form-urlencoded'],
      },
    ] as ApiOperation[];

    const res = prepareOperations(ops, {} as any);

    expect(res).toBeDefined();
    expect(res[0].headers).toMatchObject([
      {
        name: 'someOther',
        originalName: 'Some-Other',
        type: 'string',
        optional: false,
      },
      {
        name: 'contentType',
        originalName: 'Content-Type',
        type: 'string',
        optional: false,
        value: 'application/x-www-form-urlencoded',
      },
    ]);
  });

  it(`operation's param should be used instead of operation's default content types`, () => {
    const ops = [
      {
        id: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [
          {
            name: 'Content-Type',
            in: 'header',
            description: '',
            required: true,
            allowEmptyValue: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: [],
        group: null,
        accepts: ['application/json'],
        contentTypes: ['application/x-www-form-urlencoded'],
      },
    ] as ApiOperation[];

    const res = prepareOperations(ops, {} as any);

    expect(res).toBeDefined();
    expect(res[0].headers).toBeDefined();
    const orderedHeaders = sortBy(res[0].headers, 'name');
    expect(orderedHeaders).toMatchObject([
      {
        name: 'contentType',
        originalName: 'Content-Type',
        type: 'string',
        optional: false,
      },
    ]);
  });
});
