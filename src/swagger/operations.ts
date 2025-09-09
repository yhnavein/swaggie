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
 * contained in the path. If the operation has a parameter with the same name and in,
 * then it won't be added to the operation parameters.
 */
function inheritPathParams(op: ApiOperation, inheritableParams: OA3.ParameterObject[]) {
  if (inheritableParams.length === 0) {
    return;
  }

  for (const pathParam of inheritableParams) {
    // If the operation doesn't have a parameter with the same name and in, then add it
    if (
      !op.parameters.some(
        (p: OA3.ParameterObject) => p.name === pathParam.name && p.in === pathParam.in
      )
    ) {
      op.parameters.push(Object.assign({}, pathParam));
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

  const pathLevelParams = spec.paths[pathInfo.path].parameters ?? [];

  // Replace the path level parameters references with the actual parameters
  replaceReferencedParams(pathLevelParams, spec.components?.parameters ?? {});

  // Replace the operation parameters references with the actual parameters
  replaceReferencedParams(op.parameters, spec.components?.parameters ?? {});

  // At this stage path level parameters are already replaced with the actual parameters
  inheritPathParams(op, pathLevelParams as OA3.ParameterObject[]);

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

/**
 * Replaces referenced parameters with the actual parameters from the components/parameters.
 * It does replace them in place, because for parameters we only care about the actual parameter
 * and not the reference object.
 */
function replaceReferencedParams(
  parameters: ApiOperation['parameters'],
  componentParams: OA3.ComponentsObject['parameters']
) {
  for (let index = 0; index < parameters.length; index++) {
    const param = parameters[index];

    if ('$ref' in param) {
      const paramName = param.$ref.replace('#/components/parameters/', '');
      const referencedParam = componentParams[paramName];
      if (referencedParam) {
        parameters[index] = Object.assign({}, referencedParam);
      } else {
        console.error(`Parameter ${paramName} reference not found in components parameters`);
      }
    }
  }
}

interface PathInfo extends OA3.PathItemObject {
  path: string;
}
