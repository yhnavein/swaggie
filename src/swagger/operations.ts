import type { OpenAPIV3 as OA3 } from 'openapi-types';
import type {
  ApiOperation,
  ApiOperationResponse,
  ApiOperationSecurity,
  HttpMethod,
} from '../types';

const SUPPORTED_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

/**
 * This method converts dictionary-alike operation definition to operation array.
 * Additionally some data inheritance from the specification is done as well
 * @example
 * {
 *  "paths": {
 *    "/api/heartbeat": {
 *      "get": { ... },
 *      "post": { ... }
 *    }
 *  }
 * }
 * @returns
 *  [
 *    { "method": "GET", "path": "/api/heartbeat", ... },
 *    { "method": "POST", "path": "/api/heartbeat", ... },
 *  ]
 */
export function getOperations(spec: OA3.Document): ApiOperation[] {
  return getPaths(spec).reduce<ApiOperation[]>(
    (ops, pathInfo) => ops.concat(getPathOperations(pathInfo, spec)),
    []
  );
}

function getPaths(spec: OA3.Document): OA3.PathItemObject[] {
  return Object.keys(spec.paths || {}).map((path) => Object.assign({ path }, spec.paths[path]));
}

function getPathOperations(pathInfo: OA3.PathItemObject, spec: OA3.Document): ApiOperation[] {
  return Object.keys(pathInfo)
    .filter((key) => !!~SUPPORTED_METHODS.indexOf(key))
    .map((method) => getPathOperation(method as HttpMethod, pathInfo, spec));
}

function inheritPathParams(op: ApiOperation, spec: OA3.Document, pathInfo: OA3.PathItemObject) {
  const pathParams = spec.paths[pathInfo.path].parameters;
  if (pathParams) {
    for (const pathParam of pathParams) {
      if (!op.parameters.some((p) => p.name === pathParam.name && p.in === pathParam.in)) {
        op.parameters.push(Object.assign({}, pathParam));
      }
    }
  }
}

function getPathOperation(
  method: HttpMethod,
  pathInfo: OA3.PathItemObject,
  spec: OA3.Document
): ApiOperation {
  const op: ApiOperation = Object.assign(
    { method, path: pathInfo.path, parameters: [] },
    pathInfo[method]
  );

  // if there's no explicit operationId given, create one based on the method and path
  if (!op.operationId) {
    op.operationId = method + pathInfo.path;
    op.operationId = op.operationId.replace(/[\/{(?\/{)\-]([^{.])/g, (_, m) => m.toUpperCase());
    op.operationId = op.operationId.replace(/[\/}\-]/g, '');
  }

  inheritPathParams(op, spec, pathInfo);

  op.group = getOperationGroupName(op);

  return op;
}

function getOperationGroupName(op: any): string {
  let name = op.tags?.length ? op.tags[0] : 'default';
  name = name.replace(/[^$_a-z0-9]+/gi, '');
  return name.replace(/^[0-9]+/m, '');
}
