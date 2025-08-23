import type { OpenAPIV3 as OA3 } from 'openapi-types';

import { MyContentType } from '../utils';

export interface ClientData {
  clientName: string;
  camelCaseName: string;
  operations: IOperation[];
  baseUrl: string;
}

export interface IOperation {
  jsDocs?: string;
  returnType: string;
  responseContentType: string;
  method: string;
  name: string;
  url: string;
  parameters: IOperationParam[];
  query: IOperationParam[];
  body: IBodyParam;
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
}

export interface IBodyParam extends IOperationParam {
  contentType?: MyContentType;
}
