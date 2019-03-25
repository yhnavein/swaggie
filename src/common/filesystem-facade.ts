import { lstat, readdir, readFile, unlink, writeFile } from 'fs';
import { injectable } from 'inversify';
import { promisify } from 'util';

@injectable()
export class FilesystemFacade {
  lstat = promisify(lstat);
  readdir = promisify(readdir);
  readFile = promisify(readFile);
  writeFile = promisify(writeFile);
  unlink = promisify(unlink);
}
