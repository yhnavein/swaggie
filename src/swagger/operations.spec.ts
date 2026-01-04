import { test, describe, expect } from 'bun:test';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { getOperations } from './operations';
import { getDocument } from '../../test/test.utils';
import type { ApiOperation } from '../types';

describe('getOperations', () => {
  test('should handle empty operation list', () => {
    const res = getOperations(getDocument());

    expect(res.length).toBe(0);
  });

  test('should handle one operation list', () => {
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
    expect(res).toEqual(validResp);
  });

  test('should handle empty operationId or tags', () => {
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
    expect(res).toEqual(validResp);
  });

  test('should handle inheritance of parameters', () => {
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
    expect(res).toEqual(validResp);
  });

  test('should handle valid referenced parameters', () => {
    const inheritedParams: OA3.ReferenceObject[] = [
      {
        $ref: '#/components/parameters/SortByParam',
      },
    ];

    const spec = getDocument({
      components: {
        parameters: {
          SortByParam: {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string' },
            required: true,
          },
          FilterParam: {
            name: 'filter',
            in: 'query',
            schema: { type: 'string' },
            required: false,
          },
          PageSizeParam: {
            name: 'pageSize',
            in: 'header',
            schema: { type: 'number' },
            required: true,
          },
        },
      },
      paths: {
        '/api/pokemon': {
          get: {
            operationId: 'A',
            parameters: [
              {
                $ref: '#/components/parameters/FilterParam',
              },
              {
                $ref: '#/components/parameters/PageSizeParam',
              },
            ],
            responses: {},
          },
          patch: {
            operationId: 'C',
            parameters: [
              // SortBy is slightly different from the inherited parameters
              // and this version should be used instead
              {
                name: 'sortBy',
                in: 'query',
                schema: { enum: ['asc', 'desc'], type: 'string' },
                required: false,
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
        parameters: [
          {
            name: 'filter',
            in: 'query',
            schema: { type: 'string' },
            required: false,
          },
          {
            name: 'pageSize',
            in: 'header',
            schema: { type: 'number' },
            required: true,
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string' },
            required: true,
          },
        ],
        path: '/api/pokemon',
        responses: {},
      },
      {
        group: 'default',
        operationId: 'C',
        method: 'patch',
        parameters: [
          {
            name: 'sortBy',
            in: 'query',
            schema: { enum: ['asc', 'desc'], type: 'string' },
            required: false,
          },
        ],
        path: '/api/pokemon',
        responses: {},
      },
    ];
    expect(res).toEqual(validResp);
  });
});
