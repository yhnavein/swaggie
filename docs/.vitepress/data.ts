export const EXAMPLE_SPECS = [
  { label: 'Pet Store (Swagger)', url: 'https://petstore3.swagger.io/api/v3/openapi.yaml' },
  {
    label: 'Youtube Data API',
    url: 'https://api.apis.guru/v2/specs/googleapis.com/youtube/v3/openapi.json',
  },
  { label: 'TCGdex', url: 'https://api.apis.guru/v2/specs/tcgdex.net/2.0.0/openapi.json' },
  {
    label: 'Revolut Open Banking',
    url: 'https://raw.githubusercontent.com/revolut-engineering/revolut-openapi/refs/heads/master/yaml/open-banking.yaml',
  },
  {
    label: 'Google Cloud Search',
    url: 'https://api.apis.guru/v2/specs/googleapis.com/cloudsearch/v1/openapi.json',
  },
];

export const HINTS: Record<string, string> = {
  template:
    'Template used for generating the API client. Choose a bundled template by name or provide a path to a custom one.',
  generationMode:
    'Controls whether to generate a full API client (methods + schemas) or only TypeScript schemas.',
  schemaStyle: 'Controls whether object schemas are generated as interfaces or type aliases.',
  enumStyle:
    'Controls whether plain string enums are generated as union types or TypeScript enums.',
  nullableStrategy: 'Controls how OpenAPI "nullable: true" is translated into TypeScript types.',
  baseUrl: 'Base URL baked into the generated client as the default value.',
  skipDeprecated:
    'When enabled, operations marked deprecated in the spec are excluded from the generated output.',
  dateFormat:
    'Determines how date fields are typed in generated models — as the JavaScript Date object or as a plain string.',
  arrayFormat:
    'Determines how arrays are serialized in query strings: repeat (?a=1&a=2), brackets (?a[]=1), or indices (?a[0]=1).',
  servicePrefix:
    'Prefix added to every generated service name. Useful when generating multiple APIs to avoid name collisions.',
  allowDots:
    'Use dot notation for nested object query params (a.b=1) instead of bracket notation (a[b]=1).',
  preferAny: 'Use the "any" type instead of "unknown" for untyped or free-form values.',
};

export const EXAMPLE_SPEC = `openapi: "3.0.3"
info:
  title: Pet Store
  version: "1.0.0"
paths:
  /pets:
    get:
      operationId: listPets
      summary: List all pets
      tags: [pets]
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
      responses:
        "200":
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Pet"
    post:
      operationId: createPet
      summary: Create a pet
      tags: [pets]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewPet"
      responses:
        "201":
          description: Created pet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
  /pets/{petId}:
    get:
      operationId: getPetById
      summary: Get a pet by ID
      tags: [pets]
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: A single pet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
        "404":
          description: Pet not found
    delete:
      operationId: deletePet
      summary: Delete a pet
      tags: [pets]
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
      responses:
        "204":
          description: Pet deleted
components:
  schemas:
    Pet:
      type: object
      required: [id, name]
      properties:
        id:
          type: integer
        name:
          type: string
        tag:
          type: string
        status:
          type: string
          enum: [available, pending, sold]
    NewPet:
      type: object
      required: [name]
      properties:
        name:
          type: string
        tag:
          type: string
`;
