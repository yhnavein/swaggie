import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { MyContentType } from '../utils';

export interface ClientData {
  clientName: string;
  camelCaseName: string;
  operations: IOperation[];
  baseUrl: string;
}

export interface IOperation {
  /** JSDoc comment for the operation. If not provided, the operation will not be documented. */
  jsDocs?: string;
  /** Return type of the operation. */
  returnType: string;
  /** Content type of the response. */
  responseContentType: string;
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
  /** Body parameter of the operation. */
  body: IBodyParam;
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
