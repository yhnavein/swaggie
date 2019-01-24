import { ContainerModule } from 'inversify';
import { SpecFormatter } from '../spec/spec-formatter';
import { TYPES } from './types';
import { FileLoader } from '../common/file-loader';
import { FilesystemFacade } from '../common/filesystem-facade';
import { SpecRefExpander } from '../spec/spec-ref-expander';
import { SpecResolver } from '../spec/spec-resolver';
import { Generator } from '../generator';
import { OperationsParser } from '../spec';
import { DirectoryCleaner } from '../common/directory-cleaner';
import { CodeGenerator } from '../gen/js';

export const mainModule = new ContainerModule((bind) => {
  bind<CodeGenerator>(TYPES.CodeGenerator).to(CodeGenerator);
  bind<DirectoryCleaner>(TYPES.DirectoryCleaner).to(DirectoryCleaner);
  bind<FileLoader>(TYPES.FileLoader).to(FileLoader);
  bind<FilesystemFacade>(TYPES.FilesystemFacade).to(FilesystemFacade);
  bind<Generator>(TYPES.Generator).to(Generator);
  bind<OperationsParser>(TYPES.OperationsParser).to(OperationsParser);
  bind<SpecFormatter>(TYPES.SpecFormatter).to(SpecFormatter);
  bind<SpecRefExpander>(TYPES.SpecRefExpander).to(SpecRefExpander);
  bind<SpecResolver>(TYPES.SpecResolver).to(SpecResolver);
});
