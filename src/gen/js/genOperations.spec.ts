import { expect } from 'chai';
import { prepareOperations, fixDuplicateOperations, getOperationName } from './genOperations';
import type { ApiOperation } from '../../types';
import { orderBy } from '../util';

describe('prepareOperations', () => {
  // TODO: For now we ignore custom content types
  // it(`operation's content type should be put in header`, () => {
  //   const ops = [
  //     {
  //       id: 'getPetById',
  //       summary: 'Find pet by ID',
  //       description: 'Returns a single pet',
  //       method: 'get',
  //       path: '/pet/{petId}',
  //       parameters: [],
  //       responses: [],
  //       group: null,
  //       accepts: ['application/json'],
  //       contentTypes: ['application/x-www-form-urlencoded'],
  //     },
  //   ] as ApiOperation[];

  //   const res = prepareOperations(ops, {} as any);

  //   expect(res).to.be.ok;
  //   expect(res[0].headers).to.be.eql([
  //     {
  //       name: 'contentType',
  //       originalName: 'Content-Type',
  //       type: 'string',
  //       optional: false,
  //     },
  //   ]);
  // });

  it(`operation's empty header list should be handled correctly`, () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ];

    const [res] = prepareOperations(ops, {} as any);

    expect(res).to.be.ok;
    expect(res[0].headers).to.be.eql([]);
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
    ] as unknown as ApiOperation[];

    const [res] = prepareOperations(ops, {} as any);

    expect(res).to.be.ok;
    expect(res[0].headers[0]).to.be.deep.include(
      {
        name: 'someOther',
        originalName: 'Some-Other',
        type: 'string',
        optional: false,
      }
      // TODO: For now we ignore custom content types
      // {
      //   name: 'contentType',
      //   originalName: 'Content-Type',
      //   type: 'string',
      //   optional: false,
      //   value: 'application/x-www-form-urlencoded',
      // },
    );
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
    ] as unknown as ApiOperation[];

    const [res] = prepareOperations(ops, {} as any);

    expect(res).to.be.ok;
    expect(res[0].headers).to.be.ok;
    const orderedHeaders = orderBy(res[0].headers, 'name');
    expect(orderedHeaders[0]).to.deep.include({
      name: 'contentType',
      originalName: 'Content-Type',
      type: 'string',
      optional: false,
    });
  });

  describe('generate query model', () => {
    const op = {
      id: 'Pet_GetPetById',
      summary: 'Find pet by ID',
      description: 'Returns a single pet',
      method: 'get',
      path: '/pet/{petId}',
      parameters: [
        {
          name: 'FirstParameter',
          in: 'query',
          description: '',
          required: true,
          type: 'string',
        },
        {
          name: 'SecondParameter',
          in: 'query',
          description: '',
          required: true,
          type: 'string',
        },
        {
          name: 'Filter.AnotherParameter',
          in: 'query',
          description: '',
          required: true,
          type: 'string',
        },
      ],
      responses: [],
      group: 'Pet',
      accepts: ['application/json'],
      contentTypes: [],
    } as unknown as ApiOperation;
  });

  it('formdata array param should be serialized correctly as array', () => {
    const ops = [
      {
        id: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [
          {
            type: 'array',
            name: 'files',
            in: 'formData',
            collectionFormat: 'multi',
            'x-nullable': true,
            items: {
              type: 'file',
            },
          },
        ],
        responses: [],
        group: null,
        accepts: ['application/json'],
        contentTypes: ['application/x-www-form-urlencoded'],
      },
    ] as unknown as ApiOperation[];

    const [res] = prepareOperations(ops, {} as any);

    expect(res).to.be.ok;
    expect(res[0]?.parameters[0]).to.be.ok;
    expect(res[0].parameters[0].originalName).to.be.equal('files');
    expect(res[0].parameters[0].original.type).to.be.equal('array');
  });
});

describe('fixDuplicateOperations', () => {
  it('handle empty list', () => {
    const ops = [];

    const res = fixDuplicateOperations(ops);

    expect(res).to.be.eql([]);
  });

  it(`handle list with 1 item only`, () => {
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

    const res = fixDuplicateOperations(ops);

    // Basically it should be the same
    expect(res).to.be.deep.equal(ops);
  });

  it('handle 2 different operations', () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
      {
        operationId: 'somethingElse',
        summary: 'Random',
        description: 'Random',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ];

    const res = fixDuplicateOperations(ops);

    // Basically it should be the same
    expect(res).to.be.deep.equal(ops);
  });

  it('handle 2 operations with the same id', () => {
    const ops: ApiOperation[] = [
      {
        id: 'getPetById',
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        group: null,
      },
      {
        id: 'getPetById',
        summary: 'Random',
        description: 'Random',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        group: null,
      },
    ];

    const res = fixDuplicateOperations(ops);

    expect(res[1].id).not.to.be.equal(res[0].id);
  });

  // TODO: If someone wants to adjust code to fix this issue, then please go ahead :)
  /*
  it(`handle 3 operations with the same id even after fix`, () => {
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
      {
        id: 'getPetById',
        summary: 'Random',
        description: 'Random',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        responses: [],
        group: null,
        accepts: ['application/json'],
        contentTypes: [],
      },
      {
        id: 'getPetById1',
        summary: 'Random',
        description: 'Random',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        responses: [],
        group: null,
        accepts: ['application/json'],
        contentTypes: [],
      },
    ] as ApiOperation[];

    const res = fixDuplicateOperations(ops);

    console.log('Ops', ops.map(e => e.id));
    console.log('Res', res.map(e => e.id));

    expect(res[0].id).not.to.be.equal(res[1].id);
    expect(res[1].id).not.to.be.equal(res[2].id);
  });
*/
});

describe('getOperationName', () => {
  [
    { input: { opId: 'test', group: null }, expected: 'test' },
    { input: { opId: 'test', group: '' }, expected: 'test' },
    { input: { opId: null, group: 'group' }, expected: '' },
    { input: { opId: '', group: 'group' }, expected: '' },
    { input: { opId: null, group: null }, expected: '' },
    { input: { opId: '', group: '' }, expected: '' },
    {
      input: { opId: 'Test_GetPetStory', group: 'Test' },
      expected: 'getPetStory',
    },
  ].forEach((el) => {
    it(`should handle ${JSON.stringify(el.input)}`, () => {
      const res = getOperationName(el.input.opId, el.input.group);

      expect(res).to.be.equal(el.expected);
    });
  });
});
