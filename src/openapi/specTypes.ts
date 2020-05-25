interface ApiSpec extends Omit<Schema, 'components'> {
  paths: any;
  components: ApiComponents;
}

interface ApiComponents {
  /** An object to hold reusable Schema Objects. */
  schemas?: SchemaObject[];

  /** An object to hold reusable Response Objects. */
  responses?: ResponseObject[];

  /** An object to hold reusable Parameter Objects. */
  parameters?: ParameterObject[];

  /** An object to hold reusable Example Objects. */
  examples?: ExampleObject[];

  /** An object to hold reusable Request Body Objects. */
  requestBodies?: RequestBodyObject[];

  /** An object to hold reusable Header Objects. */
  headers?: HeaderObject[];

  /** An object to hold reusable Security Scheme Objects. */
  securitySchemes?: SecuritySchemeObject[];

  /** An object to hold reusable Link Objects. */
  links?: LinkObject[];

  /** An object to hold reusable Callback Objects. */
  callbacks?: any[];
}

type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
type Dict<T> = { [key: string]: T };

interface ApiOperation extends Omit<PathItemObject, 'parameters' | 'responses'> {
  id: string;
  summary: string;
  description: string;
  method: HttpMethod;
  group: string;
  path: string;
  parameters: ApiOperationParam[];
  responses: ApiOperationResponse[];
}

interface ApiOperationParam extends ApiOperationParamBase {
  name: string;
  in: 'header' | 'path' | 'query' | 'body' | 'formData';
  description: string;
  required: boolean;
  allowEmptyValue: boolean;
  schema: object;
  'x-nullable'?: boolean;
  'x-schema'?: object;
}

type CollectionFormat = 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';

interface ApiOperationParamBase {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'file';
  format:
    | 'int32'
    | 'int64'
    | 'float'
    | 'double'
    | 'byte'
    | 'binary'
    | 'date'
    | 'date-time'
    | 'password';
  items: ApiOperationParamBase;
  collectionFormat: CollectionFormat;
  default: any;
  maximum: number;
  exclusiveMaximum: boolean;
  minimum: number;
  exclusiveMinimum: boolean;
  maxLength: number;
  minLength: number;
  pattern: string;
  maxItems: number;
  minItems: number;
  uniqueItems: boolean;
  enum: any[];
  multipleOf: number;
}

interface ApiOperationResponse {
  code: string;
  description: string;
  schema: object;
  headers: object;
  examples: object;
}

interface ApiOperationSecurity {
  id: string;
  scopes?: string[];
}
