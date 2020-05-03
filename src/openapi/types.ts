export interface Schema {
  /**
   * This is the version of the OpenAPI Specification used. It SHOULD be used by tooling specifications and clients to interpret the OpenAPI document.
   * This is not related to the API info.version string.
   */
  openapi: string;

  /**
   * Provides metadata about the API. The metadata MAY be used by tooling as required.
   */
  info: SchemaInfo;

  /**
   * An array of Server Objects, which provide connectivity information to a target server.
   * If the servers property is not provided, or is an empty array,
   * the default value would be a Server Object with a url value of
   */
  servers?: [ServerObject];

  /**
   * The available paths and operations for the API.
   */
  paths: { [path: string]: PathItemObject };

  /**
   * An element to hold various schemas for the specification.
   */
  components?: SchemaComponents;

  /**
   * A declaration of which security mechanisms can be used across the API.
   * The list of values includes alternative security requirement objects that can be used.
   * Only one of the security requirement objects need to be satisfied to authorize a request.
   * Individual operations can override this definition.
   */
  security?: any[];

  /**
   * A list of tags used by the specification with additional metadata.
   * The order of the tags can be used to reflect on their order by the parsing tools.
   * Not all tags that are used by the Operation Object must be declared.
   * The tags that are not declared MAY be organized randomly or based on the tools' logic.
   * Each tag name in the list MUST be unique.
   */
  tags?: TagObject[];

  /**
   * Additional external documentation.
   */
  externalDocs?: ExternalDocs;
}

export interface SchemaComponents {
  /** An object to hold reusable Schema Objects. */
  schemas?: { [path: string]: SchemaObject | ReferenceObject };

  /** An object to hold reusable Response Objects. */
  responses?: { [path: string]: ResponseObject | ReferenceObject };

  /** An object to hold reusable Parameter Objects. */
  parameters?: { [path: string]: ParameterObject | ReferenceObject };

  /** An object to hold reusable Example Objects. */
  examples?: { [path: string]: ExampleObject | ReferenceObject };

  /** An object to hold reusable Request Body Objects. */
  requestBodies?: { [path: string]: RequestBodyObject | ReferenceObject };

  /** An object to hold reusable Header Objects. */
  headers?: { [path: string]: HeaderObject | ReferenceObject };

  /** An object to hold reusable Security Scheme Objects. */
  securitySchemes?: { [path: string]: SecuritySchemeObject | ReferenceObject };

  /** An object to hold reusable Link Objects. */
  links?: { [path: string]: LinkObject | ReferenceObject };

  /** An object to hold reusable Callback Objects. */
  callbacks?: { [path: string]: any | ReferenceObject };
}

export interface PathItemObject extends ReferenceObject {
  /** An optional, string summary, intended to apply to all operations in this path. */
  summary?: string;

  /** An optional, string description, intended to apply to all operations in this path.
   * CommonMark syntax MAY be used for rich text representation.
   */
  description?: string;

  /** A definition of a GET operation on this path. */
  get?: OperationObject;

  /** A definition of a PUT operation on this path. */
  put?: OperationObject;

  /** A definition of a POST operation on this path. */
  post?: OperationObject;

  /** A definition of a DELETE operation on this path. */
  delete?: OperationObject;

  /** A definition of a OPTIONS operation on this path. */
  options?: OperationObject;

  /** A definition of a HEAD operation on this path. */
  head?: OperationObject;

  /** A definition of a PATCH operation on this path. */
  patch?: OperationObject;

  /** A definition of a TRACE operation on this path. */
  trace?: OperationObject;

  /** An alternative server array to service all operations in this path. */
  servers?: ServerObject[];

  /**
   * A list of parameters that are applicable for all the operations described under this path.
   * These parameters can be overridden at the operation level, but cannot be removed there.
   * The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location.
   * The list can use the Reference Object to link to parameters that are defined at the OpenAPI Object’s components/parameters.
   */
  parameters?: (ParameterObject | ReferenceObject)[];
}

export interface OperationObject {
  /**
   * A list of tags for API documentation control.
   * Tags can be used for logical grouping of operations by resources or any other qualifier.
   */
  tags?: string[];

  /** A short summary of what the operation does. */
  summary?: string;

  /** A verbose explanation of the operation behavior. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** Additional external documentation for this operation. */
  externalDocs?: ExternalDocs;

  /**
   * Unique string used to identify the operation. The id MUST be unique among all operations described in the API.
   * The operationId value is case-sensitive. Tools and libraries MAY use the operationId to uniquely identify an operation,
   * therefore, it is RECOMMENDED to follow common programming naming conventions.
   */
  operationId?: string;

  /**
   * A list of parameters that are applicable for this operation. If a parameter is already defined at the Path Item,
   * the new definition will override it but can never remove it. The list MUST NOT include duplicated parameters.
   * A unique parameter is defined by a combination of a name and location. The list can use the Reference Object to
   * link to parameters that are defined at the OpenAPI Object’s components/parameters.
   */
  parameters?: (ParameterObject | ReferenceObject)[];

  /**
   * The request body applicable for this operation. The requestBody is only supported in HTTP methods where
   * the HTTP 1.1 specification [RFC7231] has explicitly defined semantics for request bodies.
   * In other cases where the HTTP spec is vague, requestBody SHALL be ignored by consumers.
   */
  requestBody?: RequestBodyObject | ReferenceObject;

  /** REQUIRED. The list of possible responses as they are returned from executing this operation. */
  responses: ResponsesObject;

  /**
   * A map of possible out-of band callbacks related to the parent operation. The key is a unique identifier for the Callback Object.
   * Each value in the map is a Callback Object that describes a request that may be initiated by the API provider and the expected responses.
   */
  callbacks?: { [name: string]: any | ReferenceObject };

  /** Declares this operation to be deprecated. Consumers SHOULD refrain from usage of the declared operation. Default value is false. */
  deprecated?: boolean;

  /**
   * A declaration of which security mechanisms can be used for this operation. The list of values includes alternative security
   * requirement objects that can be used. Only one of the security requirement objects need to be satisfied to authorize a request.
   * To make security optional, an empty security requirement ({}) can be included in the array.
   * This definition overrides any declared top-level security. To remove a top-level security declaration, an empty array can be used.
   */
  security?: any;

  /**
   * An alternative server array to service this operation.
   * If an alternative server object is specified at the Path Item Object or Root level, it will be overridden by this value.
   */
  servers?: ServerObject[];
}

export interface ParameterObject {
  /** REQUIRED. The name of the parameter. Parameter names are case sensitive. */
  name: string;

  /** REQUIRED. The location of the parameter. */
  in: 'path' | 'query' | 'header' | 'cookie';

  /** A brief description of the parameter. This could contain examples of use. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** Determines whether this parameter is mandatory. If the parameter location is "path", this property is REQUIRED and its value MUST be true.
   * Otherwise, the property MAY be included and its default value is false.
   */
  required?: boolean;

  /** Specifies that a parameter is deprecated and SHOULD be transitioned out of usage. Default value is false. */
  deprecated?: boolean;

  /**
   * Sets the ability to pass empty-valued parameters. This is valid only for query parameters and allows sending a parameter with an empty value.
   * Default value is false. If style is used, and if behavior is n/a (cannot be serialized), the value of allowEmptyValue SHALL be ignored.
   * Use of this property is NOT RECOMMENDED, as it is likely to be removed in a later revision.
   */
  allowEmptyValue?: boolean;

  /**
   * Describes how the parameter value will be serialized depending on the type of the parameter value.
   * Default values (based on value of in): for query - form; for path - simple; for header - simple; for cookie - form.
   */
  style?: string;

  /**
   * When this is true, parameter values of type array or object generate separate parameters for each value of the array or key-value pair of the map.
   * For other types of parameters this property has no effect. When style is form, the default value is true. For all other styles, the default value is false.
   */
  explode?: boolean;

  /**
   * Determines whether the parameter value SHOULD allow reserved characters, as defined by [RFC3986] :/?#[]@!$&'()*+,;= to be included without percent-encoding.
   * This property only applies to parameters with an in value of query. The default value is false.
   */
  allowReserved?: boolean;

  /** The schema defining the type used for the parameter. */
  schema?: SchemaObject | ReferenceObject;

  /**
   * Example of the parameter’s potential value. The example SHOULD match the specified schema and encoding properties if present.
   * The example field is mutually exclusive of the examples field. Furthermore, if referencing a schema that contains an example,
   * the example value SHALL override the example provided by the schema. To represent examples of media types that cannot naturally
   * be represented in JSON or YAML, a string value can contain the example with escaping where necessary.
   */
  example?: any;

  /**
   * Examples of the parameter’s potential value. Each example SHOULD contain a value in the correct format as specified in the parameter encoding.
   * The examples field is mutually exclusive of the example field.Furthermore, if referencing a schema that contains an example,
   * the examples value SHALL override the example provided by the schema.
   */
  examples?: { [name: string]: ExampleObject | ReferenceObject };

  /**
   * A map containing the representations for the parameter.
   * The key is the media type and the value describes it. The map MUST only contain one entry.
   */
  content?: { [name: string]: MediaTypeObject };
}

export type ResponsesObject =  { [name: string]: ResponseObject | ReferenceObject };

export interface ResponseObject {
  /** REQUIRED. A short description of the response. CommonMark syntax MAY be used for rich text representation. */
  description: string;

  /**
   * Maps a header name to its definition. [RFC7230] states header names are case insensitive.
   * If a response header is defined with the name "Content-Type", it SHALL be ignored.
   */
  headers?: { [name: string]: any | ReferenceObject };

  /**
   * A map containing descriptions of potential response payloads. The key is a media type or [media type range]appendix-D) and the value describes it.
   * For responses that match multiple keys, only the most specific key is applicable. e.g. text/plain overrides text/*
   */
  content?: { [name: string]: MediaTypeObject };

  /**
   * A map of operations links that can be followed from the response. The key of the map is a short name for the link,
   * following the naming constraints of the names for Component Objects.
   */
  links?: { [name: string]: LinkObject | ReferenceObject };
}

export interface RequestBodyObject {
  /** A brief description of the parameter. This could contain examples of use. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /**
   * REQUIRED. The content of the request body. The key is a media type or [media type range]appendix-D) and the value describes it.
   * For requests that match multiple keys, only the most specific key is applicable. e.g. text/plain overrides text/*
   */
  content: { [name: string]: MediaTypeObject };

  /** Determines if the request body is required in the request. Defaults to false. */
  required?: boolean;
}

export interface ReferenceObject {
  /** REQUIRED. The reference string. */
  $ref: string;
}

export interface HeaderObject extends Omit<ParameterObject, 'name' | 'in'> {}

export interface LinkObject {
  /**
   * A relative or absolute URI reference to an OAS operation. This field is mutually exclusive of the operationId field, and MUST point to an Operation Object.
   * Relative operationRef values MAY be used to locate an existing Operation Object in the OpenAPI definition.
   */
  operationRef?: string;

  /** The name of an existing, resolvable OAS operation, as defined with a unique operationId. This field is mutually exclusive of the operationRef field. */
  operationId?: string;

  /**
   * A map representing parameters to pass to an operation as specified with operationId or identified via operationRef.
   * The key is the parameter name to be used, whereas the value can be a constant or an expression
   * to be evaluated and passed to the linked operation. The parameter name can be qualified using
   * the parameter location [{in}.]{name} for operations that use the same parameter name in different locations (e.g. path.id).
   */
  parameters?: { [name: string]: any };

  /** A literal value or {expression} to use as a request body when calling the target operation. */
  requestBody?: any;

  /** A description of the link. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** A server object to be used by the target operation. */
  server?: ServerObject;
}

export interface SchemaObject
  extends JsonSchemaProperties,
    ExtendedJsonSchemaProperties,
    ReferenceObject {
  /** A true value adds "null" to the allowed type specified by the type keyword, only if type is explicitly
   * defined within the same Schema Object. Other Schema Object constraints retain their defined behavior,
   * and therefore may disallow the use of null as a value. A false value leaves the specified or default
   * type unmodified. The default value is false.
   */
  nullable?: boolean;

  /**
   * Adds support for polymorphism. The discriminator is an object name that is used to differentiate between
   * other schemas which may satisfy the payload description. See Composition and Inheritance for more details.
   */
  discriminator?: DiscriminatorObject;

  /**
   * Relevant only for Schema "properties" definitions. Declares the property as “read only”. This means that
   * it MAY be sent as part of a response but SHOULD NOT be sent as part of the request. If the property is
   * marked as readOnly being true and is in the required list, the required will take effect on the response only.
   * A property MUST NOT be marked as both readOnly and writeOnly being true. Default value is false.
   */
  readOnly?: boolean;

  /**
   * Relevant only for Schema "properties" definitions. Declares the property as “write only”. Therefore,
   * it MAY be sent as part of a request but SHOULD NOT be sent as part of the response. If the property is
   * marked as writeOnly being true and is in the required list, the required will take effect on the request only.
   * A property MUST NOT be marked as both readOnly and writeOnly being true. Default value is false.
   */
  writeOnly?: boolean;

  /**
   * This MAY be used only on properties schemas. It has no effect on root schemas.
   * Adds additional metadata to describe the XML representation of this property.
   */
  xml?: XmlObject;

  /** Additional external documentation for this schema. */
  externalDocs?: ExternalDocs;

  /**
   * A free-form property to include an example of an instance for this schema.
   * To represent examples that cannot be naturally represented in JSON or YAML, a string value can be used to contain the example with escaping where necessary.
   */
  example?: any;

  /** Specifies that a schema is deprecated and SHOULD be transitioned out of usage. Default value is false. */
  deprecated?: boolean;
}

export interface DiscriminatorObject {
  /** REQUIRED. The name of the property in the payload that will hold the discriminator value. */
  propertyName: string;

  /** An object to hold mappings between payload values and schema names or references. */
  mapping?: { [name: string]: string };
}

export interface XmlObject {
  /**
   * Replaces the name of the element/attribute used for the described schema property.
   * When defined within items, it will affect the name of the individual XML elements within the list.
   * When defined alongside type being array (outside the items), it will affect the wrapping element
   * and only if wrapped is true. If wrapped is false, it will be ignored.
   */
  name?: string;

  /** The URI of the namespace definition. Value MUST be in the form of an absolute URI. */
  namespace?: string;

  /** The prefix to be used for the name. */
  prefix?: string;

  /** Declares whether the property definition translates to an attribute instead of an element. Default value is false. */
  attribute?: boolean;

  /** MAY be used only for an array definition. Signifies whether the array is wrapped (for example, <books><book/><book/></books>) or unwrapped (<book/><book/>).
   * Default value is false. The definition takes effect only when defined alongside type being array (outside the items).
   */
  wrapped?: boolean;
}

export interface MediaTypeObject {
  /** The schema defining the content of the request, response, or parameter. */
  schema?: SchemaObject | ReferenceObject;

  /**
   * Example of the media type. The example object SHOULD be in the correct format as specified by the media type.
   * The example field is mutually exclusive of the examples field. Furthermore, if referencing a schema which contains an example,
   * the example value SHALL override the example provided by the schema.
   */
  example?: any;

  /**
   * Examples of the media type. Each example object SHOULD match the media type and specified schema if present.
   * The examples field is mutually exclusive of the example field. Furthermore, if referencing a schema which contains an example,
   * the examples value SHALL override the example provided by the schema.
   */
  examples?: { [name: string]: ExampleObject | ReferenceObject };

  encoding?: { [name: string]: EncodingObject };
}

export interface ExampleObject {
  /** Short description for the example. */
  summary?: string;

  /** Long description for the example. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /**
   * Embedded literal example. The value field and externalValue field are mutually exclusive.
   * To represent examples of media types that cannot naturally represented in JSON or YAML,
   * use a string value to contain the example, escaping where necessary.
   */
  value?: any;

  /**
   * A URL that points to the literal example. This provides the capability to reference examples that
   * cannot easily be included in JSON or YAML documents. The value field and externalValue field are mutually exclusive.
   */
  externalValue?: string;
}

export interface EncodingObject {
  /**
   * The Content-Type for encoding a specific property. Default value depends on the property type:
   * for string with format being binary – application/octet-stream; for other primitive types – text/plain;
   * for object - application/json; for array – the default is defined based on the inner type.
   * The value can be a specific media type (e.g. application/json), a wildcard media type (e.g. image/*), or a comma-separated list of the two types.
   */
  contentType?: string;

  /**
   * A map allowing additional information to be provided as headers, for example Content-Disposition.
   * Content-Type is described separately and SHALL be ignored in this section.
   * This property SHALL be ignored if the request body media type is not a multipart.
   */
  headers?: { [name: string]: any | ReferenceObject };

  /**
   * Describes how a specific property value will be serialized depending on its type. See Parameter Object for details on the style property.
   * The behavior follows the same values as query parameters, including default values.
   * This property SHALL be ignored if the request body media type is not application/x-www-form-urlencoded.
   */
  style?: string;

  /**
   * When this is true, property values of type array or object generate separate parameters for each value of the array, or key-value-pair of the map.
   * For other types of properties this property has no effect. When style is form, the default value is true.
   * For all other styles, the default value is false. This property SHALL be ignored if the request body media type is not application/x-www-form-urlencoded.
   */
  explode?: boolean;

  /**
   * Determines whether the parameter value SHOULD allow reserved characters, as defined by [RFC3986] :/?#[]@!$&'()*+,;= to be included without percent-encoding.
   * The default value is false. This property SHALL be ignored if the request body media type is not application/x-www-form-urlencoded.
   */
  allowReserved?: boolean;
}

export interface SchemaInfo {
  /** REQUIRED. The title of the API. */
  title: string;

  /** A short description of the API. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** A URL to the Terms of Service for the API. MUST be in the format of a URL. */
  termsOfService?: string;

  /** The contact information for the exposed API. */
  contact?: SchemaContact;

  /** The license information for the exposed API. */
  license?: SchemaLicense;

  /** REQUIRED. The version of the OpenAPI document (which is distinct from the OpenAPI Specification version or the API implementation version). */
  version: string;
}

export interface SchemaContact {
  /** The identifying name of the contact person/organization. */
  name?: string;

  /** The URL pointing to the contact information. MUST be in the format of a URL. */
  url?: string;

  /** The email address of the contact person/organization. MUST be in the format of an email address. */
  email?: string;
}

export interface SchemaLicense {
  /** REQUIRED. The license name used for the API. */
  name: string;

  /** A URL to the license used for the API. MUST be in the format of a URL. */
  url?: string;
}

export interface ServerObject {
  /**
   * REQUIRED. A URL to the target host. This URL supports Server Variables and MAY be relative,
   * to indicate that the host location is relative to the location where the OpenAPI document is being served.
   * Variable substitutions will be made when a variable is named in {brackets}.
   */
  name: string;

  /** An optional string describing the host designated by the URL. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** A map between a variable name and its value. The value is used for substitution in the server’s URL template. */
  variables?: { [variableName: string]: any };
}

export interface TagObject {
  /** REQUIRED. The name of the tag. */
  name: string;

  /** A short description for the tag. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** Additional external documentation for this tag. */
  externalDocs?: ExternalDocs;
}

export interface ExternalDocs {
  /** A short description of the target documentation. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** REQUIRED. The URL for the target documentation. Value MUST be in the format of a URL. */
  url: string;
}

export interface SecuritySchemeObject {
  /** REQUIRED. The type of the security scheme. */
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';

  /** A short description for security scheme. CommonMark syntax MAY be used for rich text representation. */
  description?: string;

  /** The name of the header, query or cookie parameter to be used. REQUIRED when apiKey used */
  name?: string;

  /** The location of the API key. REQUIRED when apiKey used */
  in?: 'query' | 'header' | 'cookie';

  /**
   * REQUIRED. The name of the HTTP Authorization scheme to be used in the Authorization header as defined in [RFC7235].
   * The values used SHOULD be registered in the IANA Authentication Scheme registry.
   */
  scheme: string;

  /**
   * A hint to the client to identify how the bearer token is formatted.
   * Bearer tokens are usually generated by an authorization server, so this information is primarily for documentation purposes.
   */
  bearerFormat?: string;

  /** An object containing configuration information for the flow types supported. REQUIRED when oauth2 used */
  flows?: any;

  /**
   * OpenId Connect URL to discover OAuth2 configuration values. This MUST be in the form of a URL.
   * REQUIRED when openIdConnect used
   */
  openIdConnectUrl?: string;
}

export interface JsonSchemaProperties {
  title?: number;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
}

export interface ExtendedJsonSchemaProperties {
  type?: string;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  not?: SchemaObject;
  items?: SchemaObject[];
  properties?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  description?: string;
  format?: Formats;
  default?: any;
}

export type Formats =
  | 'int32'
  | 'int64'
  | 'float'
  | 'double'
  | 'byte'
  | 'binary'
  | 'date'
  | 'date-time'
  | 'password';
