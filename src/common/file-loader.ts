import * as httpClient from 'got';
import { inject, injectable } from 'inversify';
import * as YAML from 'js-yaml';

import { TYPES } from '../ioc/types';
import { FilesystemFacade } from './';

@injectable()
export class FileLoader {
  constructor(
    @inject(TYPES.FilesystemFacade) private readonly filesystem: FilesystemFacade,
  ) { }

  async load(src: string) {
    if (/^https?:\/\//im.test(src)) {
      return this.loadFromUrl(src);
    } else if (String(process) === '[object process]') {
      const contents = await this.readFile(src);
      return this.parseFileContents(contents, src);
    } else {
      throw new Error(`Unable to load api at '${src}'`);
    }
  }

  private async loadFromUrl(url: string) {
    const response = await httpClient(url, { json: true });
    return response.body;
  }

  private async readFile(filePath: string) {
    return await this.filesystem.readFile(filePath, 'utf8');
  }

  private parseFileContents(contents: string, path: string): object {
    return /.ya?ml$/i.test(path) ? YAML.safeLoad(contents) : JSON.parse(contents);
  }
}
