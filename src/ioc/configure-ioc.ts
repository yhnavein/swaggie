import { Container } from 'inversify';
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

export function configureIoc(container: Container) {
  container.bind<CodeGenerator>(TYPES.CodeGenerator).to(CodeGenerator);
  container.bind<DirectoryCleaner>(TYPES.DirectoryCleaner).to(DirectoryCleaner);
  container.bind<FileLoader>(TYPES.FileLoader).to(FileLoader);
  container.bind<FilesystemFacade>(TYPES.FilesystemFacade).to(FilesystemFacade);
  container.bind<Generator>(TYPES.Generator).to(Generator);
  container.bind<OperationsParser>(TYPES.OperationsParser).to(OperationsParser);
  container.bind<SpecFormatter>(TYPES.SpecFormatter).to(SpecFormatter);
  container.bind<SpecRefExpander>(TYPES.SpecRefExpander).to(SpecRefExpander);
  container.bind<SpecResolver>(TYPES.SpecResolver).to(SpecResolver);
  container.bind<Set<any>>(TYPES.SetFactory).toDynamicValue(() => new Set());
}
