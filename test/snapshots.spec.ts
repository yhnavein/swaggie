import { test, describe, expect } from 'bun:test';

import { runCodeGenerator } from '../src/index';
import type { FullAppOptions, TemplateInput } from '../src/types';

type SnapshotEntry = { snapshotName: string; template: TemplateInput };

const snapshots: SnapshotEntry[] = [
  { snapshotName: 'axios', template: 'axios' },
  { snapshotName: 'xior', template: 'xior' },
  { snapshotName: 'fetch', template: 'fetch' },
  { snapshotName: 'ng1', template: 'ng1' },
  { snapshotName: 'ng2', template: 'ng2' },
  { snapshotName: 'swr', template: ['swr', 'axios'] },
  { snapshotName: 'tsq', template: ['tsq', 'xior'] },
];

describe('petstore snapshots', () => {
  for (const { snapshotName, template } of snapshots) {
    test(`should match existing ${snapshotName} snapshot`, async () => {
      const snapshotFile = `./test/snapshots/${snapshotName}.ts`;
      const parameters: FullAppOptions = {
        src: './test/petstore-v3.yml',
        out: './.tmp/test/',
        template: template as any,
        queryParamsSerialization: {
          allowDots: true,
          arrayFormat: 'repeat',
          queryParamsAsObject: 1,
        },
        nullableStrategy: 'include',
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
