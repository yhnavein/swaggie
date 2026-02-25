import { test, describe, expect } from 'bun:test';

import { runCodeGenerator } from '../src/index';
import type { FullAppOptions, Template } from '../src/types';

const templates: Template[] = ['axios', 'xior', 'swr-axios', 'fetch', 'ng1', 'ng2', 'tsq-xior'];

describe('petstore snapshots', () => {
  for (const template of templates) {
    test(`should match existing ${template} snapshot`, async () => {
      const snapshotFile = `./test/snapshots/${template}.ts`;
      const parameters: FullAppOptions = {
        src: './test/petstore-v3.yml',
        out: './.tmp/test/',
        template,
        queryParamsSerialization: {
          allowDots: true,
          arrayFormat: 'repeat',
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
});
