import type { OpenAPIV3 as OA3 } from 'openapi-types';

import type { MyContentType } from '../utils/utils';

export interface ClientData {
  clientName: string;
  /** Used for HTTP client exports (e.g. `defaultClient`). May be a JS reserved word. */
  camelCaseName: string;
  /**
   * Used for reactive hooks namespace exports (e.g. `export const main = {}`).
   * Differs from `camelCaseName` when the latter is a JS reserved word — for
   * example when no tags are present in the spec, `camelCaseName` is `'default'`
   * (valid in `defaultClient`) but `hooksCamelCaseName` is `'main'` so that the
   * hooks `export const` is syntactically valid.
   */
  hooksCamelCaseName: string;
  operations: IOperation[];
  baseUrl?: string;
}

export interface IOperation {
  /** JSDoc comment for the operation. If not provided, the operation will not be documented. */
  jsDocs?: string;
  /** Return type of the operation. */
  returnType: string;
  /** Content type of the response. */
  responseContentType: MyContentType | null;
  /** HTTP method of the operation. */
  method: string;
  /** Name of the operation. It has to be safe name. */
  name: string;
  /** URL of the operation. */
  url: string;
  /** All parameters of the operation. */
  parameters: IOperationParam[];
  /** Query parameters of the operation. */
  query: IOperationParam[];
  /** Grouped query parameter object when queryParamsAsObject is enabled. */
  queryParamObject?: IOperationParam;
  /** Body parameter of the operation. */
  body: IBodyParam | null;
  /** Headers of the operation. */
  headers: IOperationParam[];
}

export interface IOperationParam {
  originalName: string;
  name?: string;
  type?: string;
  value?: string;
  /** Whether the parameter is optional */
  optional?: boolean;
  /** Whether the parameter can be skipped. Skipped means that parameter can be skipped in the parameter list */
  skippable?: boolean;
  original?: OA3.ParameterObject | OA3.RequestBodyObject;
  jsDoc?: string;
}

export interface IBodyParam extends IOperationParam {
  contentType?: MyContentType;
}

export type PositionedParameter = OA3.ParameterObject & { 'x-position': number };
