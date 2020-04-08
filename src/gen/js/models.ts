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
  baseUrl?: string;
  operations: IApiOperation[];
}

export interface IQueryPropDefinition {
  type: string;
  required: string[];
  properties: { [key: string]: ApiOperationParam };
}

export interface IQueryDefinitions {
  [key: string]: IQueryPropDefinition;
}
