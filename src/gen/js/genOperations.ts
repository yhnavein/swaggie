import { camelCase, last, orderBy, upperFirst } from 'lodash';

import { getTSParamType } from './support';
import { groupOperationsByGroupName, getBestResponse, escapeReservedWords } from '../util';
import {
  IServiceClient,
  IApiOperation,
  IOperationParam,
  IQueryDefinitions,
  IQueryPropDefinition,
} from './models';
import { generateBarrelFile } from './createBarrel';
import { renderFile } from '../templateManager';

const MAX_QUERY_PARAMS: number = 1;

export default function genOperations(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
) {
  const groups = groupOperationsByGroupName(operations);
  let result = renderFile('baseClient.ejs', {
    reactContexts: options.reactHooks || false,
    servicePrefix: options.servicePrefix || '',
  });
  let queryDefinitions = {} as IQueryDefinitions;

  // tslint:disable-next-line:forin prefer-const
  for (let name in groups) {
    const group = groups[name];
    const [clientData, clientQueryDefinitions] = prepareClient(
      (options.servicePrefix || '') + name,
      group,
      options
    );

    result += renderFile('client.ejs', {
      ...clientData,
      servicePrefix: options.servicePrefix || '',
    });

    queryDefinitions = {
      ...queryDefinitions,
      ...clientQueryDefinitions,
    };
  }

  result += generateBarrelFile(groups, options);

  return [result, queryDefinitions];
}

function prepareClient(
  name: string,
  operations: ApiOperation[],
  options: ClientOptions
): [IServiceClient, IQueryDefinitions] {
  const [preparedOperations, queryDefinitions] = prepareOperations(operations, options);
  return [
    {
      clientName: name,
      operations: preparedOperations,
      baseUrl: options.baseUrl,
    },
    queryDefinitions,
  ];
}

export function prepareOperations(
  operations: ApiOperation[],
  options: ClientOptions
): [IApiOperation[], IQueryDefinitions] {
  const ops = fixDuplicateOperations(operations);
  const queryDefinitions = {} as IQueryDefinitions;

  return [
    ops.map((op) => {
      const response = getBestResponse(op);
      const respType = getTSParamType(response, options);

      let queryParams = getParams(op.parameters, options, ['query']);
      let params = getParams(op.parameters, options);

      if (options.queryModels && queryParams.length > MAX_QUERY_PARAMS) {
        const [newQueryParam, queryParamDefinition] = getQueryDefinition(queryParams, op, options);

        [params, queryParams] = addQueryModelToParams(params, queryParams, newQueryParam);
        queryDefinitions[newQueryParam.type] = queryParamDefinition;
      }

      return {
        returnType: respType,
        method: op.method.toUpperCase(),
        name: getOperationName(op.id, op.group),
        url: op.path,
        parameters: params,
        query: queryParams,
        formData: getParams(op.parameters, options, ['formData']),
        pathParams: getParams(op.parameters, options, ['path']),
        body: last(getParams(op.parameters, options, ['body'])),
        headers: getHeaders(op, options),
      };
    }),
    queryDefinitions,
  ];
}

/**
 * We will add numbers to the duplicated operation names to avoid breaking code
 * @param operations
 */
export function fixDuplicateOperations(operations: ApiOperation[]): ApiOperation[] {
  if (!operations || operations.length < 2) {
    return operations;
  }

  const ops = operations.map((a) => Object.assign({}, a));
  const results = orderBy(ops, (o) => o.id);

  let inc = 0;
  let prevOpId = results[0].id;
  for (let i = 1; i < results.length; i++) {
    if (results[i].id === prevOpId) {
      results[i].id += (++inc).toString();
    } else {
      inc = 0;
      prevOpId = results[i].id;
    }
  }

  return results;
}

export function getOperationName(opId: string, group?: string) {
  if (!opId) {
    return '';
  }
  if (!group) {
    return opId;
  }

  return camelCase(opId.replace(group + '_', ''));
}

function getHeaders(op: ApiOperation, options: ClientOptions): IOperationParam[] {
  const headersFromParams = getParams(op.parameters, options, ['header']);
  // TODO: At some point there may be need for a new param to add implicitly default content types
  // TODO: At this time content-type support was not essential to move forward with this functionality
  // It needs to be reviewed

  // if (
  //   op.contentTypes.length > 0 &&
  //   headersFromParams.filter((p) => p.originalName.toLowerCase() === 'content-type').length === 0
  // ) {
  //   headersFromParams.push({
  //     name: 'contentType',
  //     optional: false,
  //     originalName: 'Content-Type',
  //     type: 'string',
  //     value: op.contentTypes.join(', '),
  //   });
  // }

  return headersFromParams;
}

function getParams(
  params: ApiOperationParam[],
  options: ClientOptions,
  where?: string[]
): IOperationParam[] {
  if (!params || params.length < 1) {
    return [];
  }

  return params
    .filter((p) => !where || where.indexOf(p.in) > -1)
    .map((p) => ({
      originalName: p.name,
      name: getParamName(p.name),
      type: getTSParamType(p, options),
      optional:
        p.required === undefined || p.required === null
          ? p['x-nullable'] === undefined || p['x-nullable'] === null
            ? true
            : !!p['x-nullable']
          : !p.required,
      original: p,
    }));
}

export function renderOperationGroup(
  group: any[],
  func: any,
  spec: ApiSpec,
  options: ClientOptions
): string[] {
  return group.map((op) => func.call(this, spec, op, options)).reduce((a, b) => a.concat(b));
}

export function getParamName(name: string): string {
  return escapeReservedWords(
    name
      .split('.')
      .map((x) => camelCase(x))
      .join('_')
  );
}

function addQueryModelToParams(
  params: IOperationParam[],
  queryParams: IOperationParam[],
  queryParam: IOperationParam
): [IOperationParam[], IOperationParam[]] {
  const filteredParams = params.filter((x) => !queryParams.find((y) => y.name === x.name));
  filteredParams.push(queryParam);

  const updatedQueryParams = queryParams.map((x) => ({
    ...x,
    name: `${queryParam.name}.${x.name}`,
  }));

  return [filteredParams, updatedQueryParams];
}

/**
 * Prepares a new parameter that exposes other client parameters
 */
function getQueryDefinition(
  queryParams: IOperationParam[],
  op: ApiOperation,
  options: ClientOptions
): [IOperationParam, IQueryPropDefinition] {
  const queryParam = {
    originalName: `${op.id.replace('_', '')}Query`,
    name: getParamName(`${op.id.replace('_', '')}Query`),
    type: `I${upperFirst(getOperationName(op.id, op.group))}From${options.servicePrefix || ''}${
      op.group
    }ServiceQuery`,
    optional: false,
  } as IOperationParam;

  const queryParamDefinition = {
    type: 'object',
    required: [],
    queryParam: true,
    properties: queryParams.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.name]: curr.original,
      }),
      {}
    ),
  } as IQueryPropDefinition;

  return [queryParam, queryParamDefinition];
}
