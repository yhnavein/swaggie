import { ApiOperationParam } from '../../types';

export interface IApiOperation {
  returnType: string;
  method: string;
  name: string;
  url: string;
  body: object | null | undefined;
  parameters: IOperationParam[];
  headers: IOperationParam[];
}

export interface IOperationParam {
  name: string;
  originalName: string;
  type: string;
  optional: boolean;
  value?: string;
  original: ApiOperationParam;
}

export interface IServiceClient {
  clientName: string;
  camelCaseName: string;
  baseUrl?: string;
  operations: IApiOperation[];
}

export interface IQueryPropDefinition {
  type: string;
  format?: string;
  required?: string[];
  properties?: { [key: string]: ApiOperationParam };
  enum?: any;
  fullEnum?: any;
  description?: string;
  'x-enumNames'?: string[];
  queryParam?: boolean;
}

export interface IQueryDefinitions {
  [key: string]: IQueryPropDefinition;
}
