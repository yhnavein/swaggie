import type { OpenAPIV3 as OA3 } from 'openapi-types';
import type { ApiOperation, HttpMethod } from '../types';

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
    (acc, el) => acc.concat(getPathOperations(el, spec)),
    []
  );
}

/**
 * This method converts dictionary-alike path definition to path array
 * @example
 * "/url": { ... } -> [ { "path": "/url", ... } ]
 */
function getPaths(spec: OA3.Document): PathInfo[] {
  return Object.keys(spec.paths || {}).map((path) => Object.assign({ path }, spec.paths[path]));
}

function getPathOperations(pathInfo: PathInfo, spec: OA3.Document): ApiOperation[] {
  return Object.keys(pathInfo)
    .filter((key) => !!~SUPPORTED_METHODS.indexOf(key))
    .map((method) => getPathOperation(method as HttpMethod, pathInfo, spec));
}

/**
 * Parameters can be defined on the path level and should be inherited by all operations
 * contained in the path.
 */
function inheritPathParams(op: ApiOperation, spec: OA3.Document, pathInfo: PathInfo) {
  const pathParams = spec.paths[pathInfo.path].parameters;
  if (pathParams) {
    for (const pathParam of pathParams) {
      if ('$ref' in pathParam) {
        if (
          !op.parameters
            .filter((p) => '$ref' in p)
            .some((p: OA3.ReferenceObject) => p.$ref === pathParam.$ref)
        ) {
          op.parameters.push(Object.assign({}, pathParam));
        }
      } else {
        if (
          !op.parameters
            .filter((p) => 'name' in p)
            .some((p: OA3.ParameterObject) => p.name === pathParam.name && p.in === pathParam.in)
        ) {
          op.parameters.push(Object.assign({}, pathParam));
        }
      }
    }
  }
}

function getPathOperation(
  method: HttpMethod,
  pathInfo: PathInfo,
  spec: OA3.Document
): ApiOperation {
  const op: ApiOperation = Object.assign(
    { method, path: pathInfo.path, parameters: [], group: getOperationGroupName(pathInfo[method]) },
    pathInfo[method]
  );

  // if there's no explicit operationId given, create one based on the method and path
  // and make it normalized for further usage
  if (!op.operationId) {
    op.operationId = (method + pathInfo.path)
      .replace(/[\/{(?\/{)\-]([^{.])/g, (_, m) => m.toUpperCase())
      .replace(/[\/}\-]/g, '');
  }

  inheritPathParams(op, spec, pathInfo);

  return op;
}

/**
 * Extracts a safe group name from the operation's tags.
 * Uses the first tag as the group name, or 'default' if no tags exist.
 * Removes invalid characters and ensures the name doesn't start with a number.
 */
function getOperationGroupName(op: OA3.OperationObject): string {
  let name = op.tags?.length ? op.tags[0] : 'default';
  name = name.replace(/[^$_a-z0-9]+/gi, '');
  return name.replace(/^[0-9]+/m, '');
}

interface PathInfo extends OA3.PathItemObject {
  path: string;
}
