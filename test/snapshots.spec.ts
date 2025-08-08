import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

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
      };

      const [generatedCode] = await runCodeGenerator(parameters);

      if (process.env.UPDATE_SNAPSHOTS) {
        fs.writeFileSync(snapshotFile, generatedCode, 'utf8');
        // No need to assert anything when updating snapshots
      } else {
        const existingSnapshot = fs.readFileSync(snapshotFile, 'utf8');

        assert.strictEqual(existingSnapshot, generatedCode);
      }
    });
  }
});
