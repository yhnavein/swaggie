export interface ClientOptions {
  src: string;
  out: string;
  template: string;
  baseUrl: string;
  preferAny?: boolean;
  servicePrefix?: string;
  queryModels?: boolean;

  dateFormat?: DateSupport;
}

export interface FullAppOptions extends ClientOptions {
  config: string;
}

type DateSupport = 'string' | 'Date'; // 'luxon', 'momentjs', etc

// interface ApiOperationParam extends ApiOperationParamBase {
//   name: string;
//   in: 'header' | 'path' | 'query' | 'body' | 'formData';
//   description: string;
//   required: boolean;
//   readonly?: boolean;
//   allowEmptyValue: boolean;
//   schema: object;
//   'x-nullable'?: boolean;
//   'x-schema'?: object;
// }
