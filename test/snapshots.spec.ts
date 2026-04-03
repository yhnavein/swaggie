import { test, describe, expect } from 'bun:test';

import { runCodeGenerator } from '../src/index';
import generateMocks from '../src/gen/genMocks';
import { loadAllTemplateFiles } from '../src/utils';
import { validateTemplate, normalizeTemplate } from '../src/utils/templateValidator';
import { APP_DEFAULTS } from '../src/swagger';
import type { FullAppOptions, TemplateInput, TestingFramework } from '../src/types';
import type { AppOptions } from '../src/types';

type SnapshotEntry = { snapshotName: string; template: TemplateInput };
type MockSnapshotEntry = {
  snapshotName: string;
  template: TemplateInput;
  testingFramework: TestingFramework;
};

const snapshots: SnapshotEntry[] = [
  { snapshotName: 'axios', template: 'axios' },
  { snapshotName: 'xior', template: 'xior' },
  { snapshotName: 'fetch', template: 'fetch' },
  { snapshotName: 'ng1', template: 'ng1' },
  { snapshotName: 'ng2', template: 'ng2' },
  { snapshotName: 'swr-xior', template: ['swr', 'xior'] },
  { snapshotName: 'swr-axios', template: ['swr', 'axios'] },
  { snapshotName: 'tsq', template: ['tsq', 'xior'] },
];

const mockSnapshots: MockSnapshotEntry[] = [
  { snapshotName: 'xior.mock', template: 'xior', testingFramework: 'vitest' },
  { snapshotName: 'swr-axios.mock', template: ['swr', 'axios'], testingFramework: 'jest' },
  { snapshotName: 'tsq.mock', template: ['tsq', 'xior'], testingFramework: 'vitest' },
];

const BASE_PARAMS: Pick<
  FullAppOptions,
  'src' | 'out' | 'queryParamsSerialization' | 'nullableStrategy'
> = {
  src: './test/petstore-v3.yml',
  out: './.tmp/test/',
  queryParamsSerialization: {
    allowDots: true,
    arrayFormat: 'repeat',
    queryParamsAsObject: 1,
  },
  nullableStrategy: 'include',
};

describe('petstore snapshots', () => {
  for (const { snapshotName, template } of snapshots) {
    test(`should match existing ${snapshotName} snapshot`, async () => {
      const snapshotFile = `./test/snapshots/${snapshotName}.ts`;
      const parameters: FullAppOptions = {
        ...BASE_PARAMS,
        template: template as any,
      };

      const [generatedCode] = await runCodeGenerator(parameters);

      if (process.env.UPDATE_SNAPSHOTS) {
        await Bun.file(snapshotFile).write(generatedCode);
        // No need to assert anything when updating snapshots
      } else {
        const existingSnapshot = await Bun.file(snapshotFile).text();

        expect(existingSnapshot).toBe(generatedCode);
      }
    });
  }

  test(`should match existing schema-only snapshot`, async () => {
    const snapshotFile = `./test/snapshots/schema-only.ts`;
    const parameters: FullAppOptions = {
      src: './test/petstore-v3.yml',
      out: './.tmp/test/',
      template: 'xior',
      queryParamsSerialization: {},
      nullableStrategy: 'include',
      generationMode: 'schemas',
      schemaDeclarationStyle: 'type',
    };

    const [generatedCode] = await runCodeGenerator(parameters);

    if (process.env.UPDATE_SNAPSHOTS) {
      await Bun.file(snapshotFile).write(generatedCode);
      // No need to assert anything when updating snapshots
    } else {
      const existingSnapshot = await Bun.file(snapshotFile).text();

      expect(existingSnapshot).toBe(generatedCode);
    }
  });
});

describe('petstore mock snapshots', () => {
  for (const { snapshotName, template, testingFramework } of mockSnapshots) {
    test(`should match existing ${snapshotName} snapshot`, async () => {
      const snapshotFile = `./test/snapshots/${snapshotName}.ts`;

      // Load the spec and set up the template engine the same way runCodeGenerator does
      const { loadSpecDocument, verifyDocumentSpec } = await import('../src/utils');
      const spec = verifyDocumentSpec(await loadSpecDocument('./test/petstore-v3.yml'));

      const resolvedTemplate = normalizeTemplate(template as TemplateInput);
      validateTemplate(resolvedTemplate);
      loadAllTemplateFiles(resolvedTemplate);

      const options: AppOptions = {
        ...BASE_PARAMS,
        template: resolvedTemplate,
        servicePrefix: APP_DEFAULTS.servicePrefix,
        nullableStrategy: 'include',
        generationMode: APP_DEFAULTS.generationMode,
        schemaDeclarationStyle: APP_DEFAULTS.schemaDeclarationStyle,
        enumDeclarationStyle: APP_DEFAULTS.enumDeclarationStyle,
        enumNamesStyle: APP_DEFAULTS.enumNamesStyle,
        queryParamsSerialization: {
          allowDots: true,
          arrayFormat: 'repeat',
          queryParamsAsObject: 1,
        },
        testingFramework,
        mocks: './.tmp/test/api.mock.ts',
      };

      // The relative import from the mock file to the real client.
      // For snapshots we use a stable canonical value.
      const relativeApiImport = './api';

      const generatedCode = generateMocks(spec, options, relativeApiImport);

      if (process.env.UPDATE_SNAPSHOTS) {
        await Bun.file(snapshotFile).write(generatedCode);
        // No need to assert anything when updating snapshots
      } else {
        const existingSnapshot = await Bun.file(snapshotFile).text();

        expect(existingSnapshot).toBe(generatedCode);
      }
    });
  }
});
