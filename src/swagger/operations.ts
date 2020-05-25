import { ApiOperation, ApiOperationResponse, ApiSpec, HttpMethod } from '../openapi/specTypes';

const SUPPORTED_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

/**
 * This method converts dictionary operation definitions to operation array.
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
export function getOperations(spec: Schema): ApiOperation[] {
  return getPaths(spec).reduce<ApiOperation[]>(
    (ops, pathInfo) => ops.concat(getPathOperations(pathInfo, spec)),
    [],
  );
}

function getPaths(spec: Schema): object[] {
  return Object.keys(spec.paths || {}).map((path) => Object.assign({ path }, spec.paths[path]));
}

function getPathOperations(pathInfo, spec): ApiOperation[] {
  return Object.keys(pathInfo)
    .filter((key) => !!~SUPPORTED_METHODS.indexOf(key))
    .map((method) => getPathOperation(method as HttpMethod, pathInfo, spec));
}

function inheritPathParams(op, spec, pathInfo) {
  const pathParams = spec.paths[pathInfo.path].parameters;
  if (pathParams) {
    pathParams.forEach((pathParam) => {
      if (!op.parameters.some((p) => p.name === pathParam.name && p.in === pathParam.in)) {
        op.parameters.push(Object.assign({}, pathParam));
      }
    });
  }
}

function getPathOperation(method: HttpMethod, pathInfo, spec: ApiSpec): ApiOperation {
  const op = Object.assign({ method, path: pathInfo.path, parameters: [] }, pathInfo[method]);
  op.id = op.operationId;

  // if there's no explicit operationId given, create one based on the method and path
  if (!op.id) {
    op.id = method + pathInfo.path;
    op.id = op.id.replace(/[\/{(?\/{)\-]([^{.])/g, (_, m) => m.toUpperCase());
    op.id = op.id.replace(/[\/}\-]/g, '');
  }

  inheritPathParams(op, spec, pathInfo);

  op.group = getOperationGroupName(op);
  delete op.operationId;
  op.responses = getOperationResponses(op);
  op.security = getOperationSecurity(op, spec);

  return op as ApiOperation;
}

function getOperationGroupName(op: any): string {
  let name = op.tags && op.tags.length ? op.tags[0] : 'default';
  name = name.replace(/[^$_a-z0-9]+/gi, '');
  return name.replace(/^[0-9]+/m, '');
}

function getOperationResponses(op: any): ApiOperationResponse[] {
  return Object.keys(op.responses || {}).map((code) => {
    const info = op.responses[code];
    info.code = code;
    return info;
  });
}

function getOperationSecurity(op: any, spec: any): any[] {
  let security;

  if (op.security && op.security.length) {
    security = op.security;
  } else if (spec.security && spec.security.length) {
    security = spec.security;
  } else {
    return;
  }

  return security.map((def) => {
    const id = Object.keys(def)[0];
    const scopes = def[id].length ? def[id] : undefined;
    return { id, scopes };
  });
}
