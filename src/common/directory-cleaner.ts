import { injectable, inject } from 'inversify';
import * as path from 'path';

import { TYPES } from '../ioc/types';
import { FilesystemFacade } from './filesystem-facade';
import { ClientOptions } from '../types';

const TS_EXTENSION = 'ts';

@injectable()
export class DirectoryCleaner {
  constructor(
    @inject(TYPES.FilesystemFacade) private readonly fs: FilesystemFacade,
  ) { }

  removeOldFiles(options: ClientOptions) {
    this.cleanDirs(options.outDir, options);
  }

  async cleanDirs(dir: string, options: ClientOptions) {
    dir = path.resolve(dir);
    const stats = await this.fs.lstat(dir);
    if (!stats || !stats.isDirectory()) {
      return;
    }

    const files = (await this.fs.readdir(dir)).map((file) => path.resolve(`${dir}/${file}`));
    while (files.length) {
      const file = files.pop();
      if (file.endsWith(TS_EXTENSION) && !file.endsWith(`index.${TS_EXTENSION}`)) {
        await this.fs.unlink(file);
      } else if ((await this.fs.lstat(file)).isDirectory()) {
        await this.cleanDirs(file, options);
      }
    }
  }
}
