import { expect } from 'chai';

import { prepareOperations, fixDuplicateOperations, getOperationName } from './genOperations';
import type { ApiOperation } from '../../types';
import { getClientOptions } from '../../utils';

describe('prepareOperations', () => {
  const opts = getClientOptions();

  describe('parameters', () => {
    it('should prepare parameter types for use in templates', () => {
      const ops: ApiOperation[] = [
        {
          operationId: 'getPetById',
          method: 'get',
          path: '/pet/{petId}',
          parameters: [
            {
              name: 'Org-ID',
              in: 'header',
              required: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'OrgType',
              in: 'query',
              required: false,
              allowEmptyValue: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'petId',
              in: 'path',
              required: false,
              schema: {
                type: 'number',
                format: 'int64',
              },
            },
          ],
          responses: {},
          group: null,
        },
      ];

      const [res] = prepareOperations(ops, opts);

      expect(res.name).to.equal('getPetById');
      expect(res.method).to.equal('GET');
      expect(res.body).to.be.undefined;
      expect(res.returnType).to.equal('unknown');

      expect(res.headers.pop()).to.deep.include({
        name: 'orgID',
        originalName: 'Org-ID',
        type: 'string',
        optional: false,
      });

      expect(res.query.pop()).to.deep.include({
        name: 'orgType',
        originalName: 'OrgType',
        type: 'string',
        optional: true,
      });

      expect(res.pathParams.pop()).to.deep.include({
        name: 'petId',
        originalName: 'petId',
        type: 'number',
        optional: true,
      });
    });
  });
});

describe('fixDuplicateOperations', () => {
  const testCases = [
    { input: [], expected: [] },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
  ];
  for (const { input, expected } of testCases) {
    it(`should handle ${input} as input`, () => {
      const res = fixDuplicateOperations(input);

      expect(res).to.deep.eq(expected);
    });
  }

  it('handle list with 1 operation only', () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
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

  it('handle 2 different operations', () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
      {
        operationId: 'somethingElse',
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

  it('handle 2 operations with the same operationId', () => {
    const ops: ApiOperation[] = [
      {
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
      {
        operationId: 'getPetById',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ];

    const res = fixDuplicateOperations(ops);

    expect(res[1].operationId).not.to.be.equal(res[0].operationId);
  });

  // TODO: If someone wants to adjust code to fix this issue, then please go ahead :)
  /*
  it(`handle 3 operations with the same operationId even after fix`, () => {
    const ops = [
      {
        operationId: 'getPetById',
        method: 'get',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
      {
        operationId: 'getPetById',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
      {
        operationId: 'getPetById1',
        method: 'post',
        path: '/pet/{petId}',
        parameters: [],
        responses: {},
        group: null,
      },
    ] as ApiOperation[];

    const res = fixDuplicateOperations(ops);

    console.log('Ops', ops.map(e => e.operationId));
    console.log('Res', res.map(e => e.operationId));

    expect(res[0].operationId).not.to.be.equal(res[1].operationId);
    expect(res[1].operationId).not.to.be.equal(res[2].operationId);
  });
*/
});

describe('getOperationName', () => {
  const testCases = [
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
  ];

  for (const { input, expected } of testCases) {
    it(`should handle ${JSON.stringify(input)}`, () => {
      const res = getOperationName(input.opId, input.group);

      expect(res).to.be.equal(expected);
    });
  }
});
