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
}

export interface IServiceClient {
  clientName: string;
  operations: IApiOperation[];
}
