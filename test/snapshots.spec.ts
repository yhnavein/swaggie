import { expect } from 'chai';
import fs from 'node:fs';

import { runCodeGenerator } from '../src/index';
import type { FullAppOptions, Template } from '../src/types';

const templates: Template[] = ['axios', 'xior', 'swr-axios', 'fetch', 'ng1', 'ng2'];

describe('petstore snapshots', () => {
  for (const template of templates) {
    it(`should match existing ${template} snapshot`, async () => {
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
        expect(true).to.eq(true);
      } else {
        const existingSnapshot = fs.readFileSync(snapshotFile, 'utf8');

        expect(existingSnapshot).to.equal(generatedCode);
      }
    });
  }
});
