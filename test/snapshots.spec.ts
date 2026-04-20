import { test, describe, expect } from 'bun:test';

import { runCodeGenerator } from '../src/index';
import generateMocks from '../src/gen/genMocks';
import { loadAllTemplateFiles } from '../src/utils';
import { validateTemplate, normalizeTemplate } from '../src/utils/templateValidator';
import { APP_DEFAULTS } from '../src/swagger';
import type { FullAppOptions, TemplateInput, TestingFramework } from '../src/types';
import type { AppOptions } from '../src/types';

type SnapshotEntry = { snapshotName: string; template: TemplateInput };
type HooksSnapshotEntry = { snapshotName: string; hooksSnapshotName: string; template: TemplateInput };
type MockSnapshotEntry = {
  snapshotName: string;
  template: TemplateInput;
  testingFramework: TestingFramework;
  hooksSnapshotName?: string;
};

const snapshots: SnapshotEntry[] = [
  { snapshotName: 'axios', template: 'axios' },
  { snapshotName: 'xior', template: 'xior' },
  { snapshotName: 'fetch', template: 'fetch' },
  { snapshotName: 'ng1', template: 'ng1' },
  { snapshotName: 'ng2', template: 'ng2' },
  { snapshotName: 'ky', template: 'ky' },
  { snapshotName: 'swr-xior', template: ['swr', 'xior'] },
  { snapshotName: 'swr-axios', template: ['swr', 'axios'] },
  { snapshotName: 'swr-ky', template: ['swr', 'ky'] },
  { snapshotName: 'tsq', template: ['tsq', 'xior'] },
];

type ClientSetupSnapshotEntry = {
  snapshotName: string;
  setupSnapshotName: string;
  template: TemplateInput;
};

/** Snapshots that test the --clientSetup mode (main file + write-once setup scaffold) */
const clientSetupSnapshots: ClientSetupSnapshotEntry[] = [
  {
    snapshotName: 'ky-with-setup',
    setupSnapshotName: 'ky-setup',
    template: 'ky',
  },
];

/** Snapshots that test the split-file (--hooksOut) mode */
const hooksSnapshots: HooksSnapshotEntry[] = [
  {
    snapshotName: 'swr-axios-split',
    hooksSnapshotName: 'swr-axios-split.hooks',
    template: ['swr', 'axios'],
  },
  {
    snapshotName: 'tsq-split',
    hooksSnapshotName: 'tsq-split.hooks',
    template: ['tsq', 'xior'],
  },
];

const mockSnapshots: MockSnapshotEntry[] = [
  { snapshotName: 'xior.mock', template: 'xior', testingFramework: 'vitest' },
  { snapshotName: 'swr-axios.mock', template: ['swr', 'axios'], testingFramework: 'jest' },
  { snapshotName: 'tsq.mock', template: ['tsq', 'xior'], testingFramework: 'vitest' },
  { snapshotName: 'ng2.mock', template: 'ng2', testingFramework: 'vitest' },
  // Split-file (--hooksOut) mock: hooks are in a separate file, so the mock imports both
  {
    snapshotName: 'swr-axios-split.mock',
    template: ['swr', 'axios'],
    testingFramework: 'jest',
    hooksSnapshotName: 'hooks',
  },
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

describe('petstore split-file (hooksOut) snapshots', () => {
  for (const { snapshotName, hooksSnapshotName, template } of hooksSnapshots) {
    test(`should match existing ${snapshotName} + ${hooksSnapshotName} snapshots`, async () => {
      const mainSnapshotFile = `./test/snapshots/${snapshotName}.ts`;
      const hooksSnapshotFile = `./test/snapshots/${hooksSnapshotName}.ts`;

      const mainOut = `./.tmp/test/${snapshotName}.ts`;
      const hooksOut = `./.tmp/test/${hooksSnapshotName}.ts`;

      const parameters: FullAppOptions = {
        ...BASE_PARAMS,
        out: mainOut,
        template: template as any,
        hooksOut,
        useClient: true,
      };

      const [generatedCode] = await runCodeGenerator(parameters);

      // Read the hooks file that was written to disk
      const hooksCode = await Bun.file(hooksOut).text();

      if (process.env.UPDATE_SNAPSHOTS) {
        await Bun.file(mainSnapshotFile).write(generatedCode);
        await Bun.file(hooksSnapshotFile).write(hooksCode);
      } else {
        const existingMainSnapshot = await Bun.file(mainSnapshotFile).text();
        const existingHooksSnapshot = await Bun.file(hooksSnapshotFile).text();

        expect(existingMainSnapshot).toBe(generatedCode);
        expect(existingHooksSnapshot).toBe(hooksCode);
      }
    });
  }
});

describe('petstore mock snapshots', () => {
  for (const { snapshotName, template, testingFramework, hooksSnapshotName } of mockSnapshots) {
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
        ...(hooksSnapshotName !== undefined ? { hooksOut: `./.tmp/test/${hooksSnapshotName}.ts` } : {}),
      };

      // The relative import from the mock file to the real client.
      // For snapshots we use a stable canonical value.
      const relativeApiImport = './api';
      const relativeHooksImport = hooksSnapshotName !== undefined ? `./${hooksSnapshotName}` : undefined;

      const generatedCode = generateMocks(spec, options, relativeApiImport, relativeHooksImport);

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

describe('petstore --clientSetup snapshots', () => {
  for (const { snapshotName, setupSnapshotName, template } of clientSetupSnapshots) {
    test(`should match existing ${snapshotName} + ${setupSnapshotName} snapshots`, async () => {
      const mainSnapshotFile = `./test/snapshots/${snapshotName}.ts`;
      const setupSnapshotFile = `./test/snapshots/${setupSnapshotName}.ts`;

      const mainOut = `./.tmp/test/clientsetup-${snapshotName}.ts`;
      const setupOut = `./.tmp/test/clientsetup-${setupSnapshotName}.ts`;

      const parameters: FullAppOptions = {
        ...BASE_PARAMS,
        out: mainOut,
        template: template as any,
        clientSetup: setupOut,
        forceSetup: true,
      };

      const [generatedCode] = await runCodeGenerator(parameters);
      const setupCode = await Bun.file(setupOut).text();

      if (process.env.UPDATE_SNAPSHOTS) {
        await Bun.file(mainSnapshotFile).write(generatedCode);
        await Bun.file(setupSnapshotFile).write(setupCode);
      } else {
        const existingMainSnapshot = await Bun.file(mainSnapshotFile).text();
        const existingSetupSnapshot = await Bun.file(setupSnapshotFile).text();

        expect(existingMainSnapshot).toBe(generatedCode);
        expect(existingSetupSnapshot).toBe(setupCode);
      }
    });
  }
});
