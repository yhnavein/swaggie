import { test, describe, beforeEach, expect, spyOn } from 'bun:test';
import path from 'node:path';
import { loadSpecDocument } from './documentLoader';
import { mockFetchWithContent, mockFetchWithFile } from '../../test/test.utils';

// URLs are not used to fetch anything. We are mocking the global fetch function
const petstore3 = {
  json: 'https://petstore.swagger.io/v3/swagger.json',
  yaml: 'https://petstore.swagger.io/v3/swagger.yaml',
};

describe('loadSpecDocument', () => {
  let mockFetch: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Spy on the global fetch function
    mockFetch = spyOn(global, 'fetch');
  });

  test('should resolve a JSON spec from url', async () => {
    await mockFetchWithFile(mockFetch, petstore3.json, 'petstore-v3.json');

    const spec = await loadSpecDocument(petstore3.json);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a YAML spec from url', async () => {
    await mockFetchWithFile(mockFetch, petstore3.yaml, 'petstore-v3.yml');

    const spec = await loadSpecDocument(petstore3.yaml);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a YAML spec from an extensionless url', async () => {
    const urlWithoutExtension = petstore3.yaml.replace('.yaml', '');
    await mockFetchWithFile(mockFetch, urlWithoutExtension, 'petstore-v3.yml');

    const spec = await loadSpecDocument(urlWithoutExtension);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a JSON spec from an extensionless url', async () => {
    const urlWithoutExtension = petstore3.json.replace('.json', '');
    await mockFetchWithFile(mockFetch, urlWithoutExtension, 'petstore-v3.json');

    const spec = await loadSpecDocument(urlWithoutExtension);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should resolve a YAML spec from local file', async () => {
    const path = `${__dirname}/../../test/petstore-v3.yml`;
    const spec = await loadSpecDocument(path);
    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test('should handle nonexistent local file', async () => {
    const path = `${__dirname}/../../test/nonexistent.yml`;

    try {
      await loadSpecDocument(path);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e.message.includes('ENOENT') || e.message.includes('no such file')).toBe(true);
    }
  });

  test('should handle malformed JSON file', async () => {
    const malformedUrl = 'https://example.com/malformed.json';
    mockFetchWithContent(mockFetch, malformedUrl, '{"invalid": json}');

    try {
      await loadSpecDocument(malformedUrl);
      throw new Error('Expected error to be thrown');
    } catch (e) {
      expect(e instanceof SyntaxError).toBe(true);
    }
  });

  test('should handle passing an object directly', async () => {
    const mockSpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    const spec = await loadSpecDocument(mockSpec);
    expect(spec).toEqual(mockSpec);
  });

  test('should resolve external refs from local files into local component refs', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const responseRef = spec.paths['/pets'].get.responses['200'].$ref;
    const responseSchemaRef =
      spec.components.responses.PetsResponse.content['application/json'].schema.items.$ref;
    const postSchemaRef =
      spec.paths['/pets'].post.responses['201'].content['application/json'].schema.$ref;
    const bodyRef = spec.paths['/pets'].post.requestBody.$ref;
    const bodySchemaRef =
      spec.components.requestBodies.CreatePetBody.content['application/json'].schema.$ref;

    expect(responseRef).toMatch(/^#\/components\/responses\//);
    expect(responseSchemaRef).toMatch(/^#\/components\/schemas\//);
    expect(postSchemaRef).toMatch(/^#\/components\/schemas\//);
    expect(bodyRef).toMatch(/^#\/components\/requestBodies\//);
    expect(bodySchemaRef).toMatch(/^#\/components\/schemas\//);

    const resolvedParam = spec.paths['/pets'].get.parameters[0];
    expect(resolvedParam.$ref).toMatch(/^#\/components\/parameters\//);
    expect(spec.components.parameters.OrgId.name).toBe('orgId');

    const refs = collectRefs(spec);
    expect(refs.some((r) => /\.ya?ml#|\.json#/i.test(r))).toBe(false);

    const schemaKeys = Object.keys(spec.components.schemas || {});
    expect(schemaKeys).toContain('Pet');
    expect(schemaKeys).toContain('User');
    expect(schemaKeys).toContain('Address');
    expect(schemaKeys).toContain('Category');
  });

  test('should deduplicate reused external refs', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const responseItemsRef =
      spec.components.responses.PetsResponse.content['application/json'].schema.items.$ref;
    const postSchemaRef =
      spec.paths['/pets'].post.responses['201'].content['application/json'].schema.$ref;
    const bodySchemaRef =
      spec.components.requestBodies.CreatePetBody.content['application/json'].schema.$ref;

    expect(responseItemsRef).toBe(postSchemaRef);
    expect(postSchemaRef).toBe(bodySchemaRef);
  });

  test('should preserve local component names and alias only on collision', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-collision.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const responseRef =
      spec.paths['/users'].get.responses['200'].content['application/json'].schema.$ref;
    expect(responseRef).toMatch(/^#\/components\/schemas\//);

    const localUser = spec.components.schemas.User;
    expect(localUser.properties.local.type).toBe('boolean');

    const allSchemaNames = Object.keys(spec.components.schemas || {});
    const externalUserName = allSchemaNames.find((name) => name !== 'User');
    expect(externalUserName).toBeDefined();
    expect(spec.components.schemas[externalUserName].properties.external.type).toBe('boolean');
    expect(responseRef).toBe(`#/components/schemas/${externalUserName}`);
  });

  test('should reject external http refs in local file specs', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-http-ref.yml');

    await expect(loadSpecDocument(specPath)).rejects.toThrow('External HTTP refs are not supported');
  });

  test('should reject external refs without fragment', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-no-fragment.yml');

    await expect(loadSpecDocument(specPath)).rejects.toThrow(
      'External refs must include a JSON pointer fragment'
    );
  });

  test('should inline external refs that point outside components', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-unsupported-target.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const schema =
      spec.paths['/test'].get.responses['200'].content['application/json'].schema;
    expect(schema.type).toBe('array');
    expect(schema.items.$ref).toBe('#/components/schemas/Pet');
  });

  test('should fail when external ref file does not exist', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-missing-file.yml');

    await expect(loadSpecDocument(specPath)).rejects.toThrow();
  });

  test('should fail when external ref pointer does not exist', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-missing-pointer.yml');

    await expect(loadSpecDocument(specPath)).rejects.toThrow('Could not resolve ref pointer');
  });

  test('should inline unsupported component sections for external refs', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-unsupported-section.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const headerSchema =
      spec.paths['/test'].get.responses['200'].headers['x-correlation-id'].schema;
    expect(headerSchema.type).toBe('string');
  });

  test('should reject external refs with invalid pointer fragment format', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-invalid-fragment-format.yml');

    await expect(loadSpecDocument(specPath)).rejects.toThrow('Unsupported $ref pointer format');
  });

  test('should reject malformed local fragments that do not start with #/', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-bad-local-fragment.yml');

    await expect(loadSpecDocument(specPath)).rejects.toThrow('Unsupported $ref format');
  });

  test('should inline external refs with empty component names as unresolved and fail', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-invalid-target.yml');

    await expect(loadSpecDocument(specPath)).rejects.toThrow('Could not resolve ref pointer');
  });

  test('should support extensionless JSON external component files', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-extensionless-json.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const schemaRef =
      spec.paths['/test'].get.responses['200'].content['application/json'].schema.$ref;
    expect(schemaRef).toMatch(/^#\/components\/schemas\//);
    expect(Object.keys(spec.components.schemas || {})).toContain('Box');
  });

  test('should support external refs to legacy root-level parameters', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-legacy-parameters.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const ref = spec.paths['/system/users/{userId}/roles'].parameters[0].$ref;
    expect(ref).toMatch(/^#\/components\/parameters\//);

    const paramName = ref.split('/').pop();
    const resolved = spec.components.parameters[paramName];
    expect(resolved.name).toBe('userId');
    expect(resolved.in).toBe('path');
    expect(resolved.required).toBe(true);
  });

  test('should support external refs to legacy root-level responses', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-legacy-responses.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const ref = spec.paths['/test'].get.responses['200'].$ref;
    expect(ref).toMatch(/^#\/components\/responses\//);

    const responseName = ref.split('/').pop();
    expect(spec.components.responses[responseName].content['application/json'].schema.type).toBe(
      'string'
    );
  });

  test('should support external refs to legacy root-level requestBodies', async () => {
    const specPath = path.join(
      __dirname,
      '../../test/external-refs/main-legacy-request-bodies.yml'
    );
    const spec = (await loadSpecDocument(specPath)) as any;

    const ref = spec.paths['/test'].post.requestBody.$ref;
    expect(ref).toMatch(/^#\/components\/requestBodies\//);

    const bodyName = ref.split('/').pop();
    const schema = spec.components.requestBodies[bodyName].content['application/json'].schema;
    expect(schema.type).toBe('object');
  });

  test('should map legacy root-level definitions to components schemas', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-legacy-definitions.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const ref =
      spec.paths['/test'].get.responses['200'].content['application/json'].schema.$ref;
    expect(ref).toMatch(/^#\/components\/schemas\//);

    const schemaName = ref.split('/').pop();
    expect(spec.components.schemas[schemaName].properties.id.type).toBe('string');
  });

  test('should fail on circular non-component external refs', async () => {
    const specPath = path.join(
      __dirname,
      '../../test/external-refs/main-circular-non-components.yml'
    );

    await expect(loadSpecDocument(specPath)).rejects.toThrow(
      'Circular non-component external ref is not supported'
    );
  });

  test('should support extensionless YAML external files', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-extensionless-yaml.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const ref =
      spec.paths['/test'].get.responses['200'].content['application/json'].schema.$ref;
    expect(ref).toMatch(/^#\/components\/schemas\//);
    expect(Object.keys(spec.components.schemas || {})).toContain('PlainModel');
  });

  test('should support .json external files', async () => {
    const specPath = path.join(__dirname, '../../test/external-refs/main-json-ext.yml');
    const spec = (await loadSpecDocument(specPath)) as any;

    const ref =
      spec.paths['/test'].get.responses['200'].content['application/json'].schema.$ref;
    expect(ref).toMatch(/^#\/components\/schemas\//);
    expect(Object.keys(spec.components.schemas || {})).toContain('JsonBox');
  });
});

function collectRefs(obj: unknown): string[] {
  if (!obj) {
    return [];
  }

  if (Array.isArray(obj)) {
    return obj.flatMap((item) => collectRefs(item));
  }

  if (typeof obj !== 'object') {
    return [];
  }

  const record = obj as Record<string, unknown>;
  const refs = typeof record.$ref === 'string' ? [record.$ref] : [];

  return refs.concat(Object.values(record).flatMap((value) => collectRefs(value)));
}
