import { injectable } from 'inversify';
import {
  readdir,
  readFile,
  writeFile,
  lstat,
  unlink,
} from 'fs';
import { promisify } from 'util';

@injectable()
export class FilesystemFacade {
  lstat = promisify(lstat);
  readdir = promisify(readdir);
  readFile = promisify(readFile);
  writeFile = promisify(writeFile);
  unlink = promisify(unlink);
}
