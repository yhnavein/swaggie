import { expect } from 'chai';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { getOperations } from './operations';
import { getDocument } from '../utils';
import type { ApiOperation } from '../types';

describe('getOperations', () => {
  it('should handle empty operation list', () => {
    const res = getOperations(getDocument());

    expect(res.length).to.eq(0);
  });

  it('should handle one operation list', () => {
    const spec = getDocument({
      paths: {
        '/api/heartbeat': {
          get: {
            tags: ['System'],
            operationId: 'ApiHeartbeatGet',
            responses: {
              '200': {
                description: 'Service is available.',
              },
            },
          },
        },
      },
    });

    const res = getOperations(spec);

    const validResp: ApiOperation[] = [
      {
        group: 'System',
        operationId: 'ApiHeartbeatGet',
        method: 'get',
        parameters: [],
        path: '/api/heartbeat',
        responses: { 200: { description: 'Service is available.' } },
        tags: ['System'],
      },
    ];
    expect(res).to.deep.equal(validResp);
  });

  it('should handle empty operationId or tags', () => {
    const spec = getDocument({
      paths: {
        '/api/heartbeat': {},
        '/api/pokemon': {
          get: {
            tags: ['Pokemon'],
            operationId: null,
            responses: {
              '200': { $ref: '#/components/responses/PokemonList' },
            },
          },
          post: {
            tags: [],
            operationId: null,
            responses: {},
          },
          patch: {
            operationId: 'pokePatch',
            responses: {},
          },
        },
      },
    });

    const res = getOperations(spec);

    const validResp: ApiOperation[] = [
      {
        group: 'Pokemon',
        // id will be generated as sanitized method + path when it's not defined
        operationId: 'getApiPokemon',
        method: 'get',
        parameters: [],
        path: '/api/pokemon',
        responses: { 200: { $ref: '#/components/responses/PokemonList' } },
        tags: ['Pokemon'],
      },
      {
        group: 'default',
        // id will be generated as sanitized method + path when it's not defined
        operationId: 'postApiPokemon',
        method: 'post',
        parameters: [],
        path: '/api/pokemon',
        responses: {},
        tags: [],
      },
      {
        group: 'default',
        operationId: 'pokePatch',
        method: 'patch',
        parameters: [],
        path: '/api/pokemon',
        responses: {},
      },
    ];
    expect(res).to.deep.equal(validResp);
  });

  it('should handle inheritance of parameters', () => {
    const inheritedParams: OA3.ParameterObject[] = [
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' },
      },
      {
        name: 'offset',
        in: 'query',
        schema: { type: 'integer' },
      },
      {
        name: 'filter',
        in: 'query',
        schema: { $ref: '#/components/schemas/Filter' },
      },
    ];

    const spec = getDocument({
      paths: {
        '/api/pokemon': {
          get: {
            operationId: 'A',
            parameters: [],
            responses: {},
          },
          post: {
            operationId: 'B',
            responses: {},
          },
          patch: {
            operationId: 'C',
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'number', format: 'int32' },
              },
              {
                name: 'sort',
                in: 'query',
                schema: { $ref: '#/components/schemas/Sort' },
              },
            ],
            responses: {},
          },
          // parameters that should be inherited by all operations above
          parameters: inheritedParams,
        },
      },
    });

    const res = getOperations(spec);

    const validResp: ApiOperation[] = [
      {
        group: 'default',
        operationId: 'A',
        method: 'get',
        parameters: inheritedParams,
        path: '/api/pokemon',
        responses: {},
      },
      {
        group: 'default',
        operationId: 'B',
        method: 'post',
        parameters: inheritedParams,
        path: '/api/pokemon',
        responses: {},
      },
      {
        group: 'default',
        operationId: 'C',
        method: 'patch',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', format: 'int32' },
          },
          {
            name: 'sort',
            in: 'query',
            schema: { $ref: '#/components/schemas/Sort' },
          },
          inheritedParams[1],
          inheritedParams[2],
        ],
        path: '/api/pokemon',
        responses: {},
      },
    ];
    expect(res).to.deep.equal(validResp);
  });
});
