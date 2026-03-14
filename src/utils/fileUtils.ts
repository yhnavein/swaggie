import { mkdir, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function saveFile(filePath: string, contents: string) {
  return new Promise((resolve, reject) => {
    mkdir(dirname(filePath), { recursive: true }, (err) => {
      if (err) {
        reject(err);
      }

      writeFileSync(filePath, contents);
      resolve(true);
    });
  });
}
