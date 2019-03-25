import { Container } from 'inversify';

import { DirectoryCleaner, FileLoader, FilesystemFacade } from '../common';
import { CodeGenerator } from '../gen';
import { Generator } from '../generator';
import { OperationsParser } from '../spec';
import { SpecFormatter } from '../spec/spec-formatter';
import { SpecResolver } from '../spec/spec-resolver';
import { Ejs, TYPES } from './types';

const container = new Container();

container.bind<CodeGenerator>(TYPES.CodeGenerator).to(CodeGenerator);
container.bind<DirectoryCleaner>(TYPES.DirectoryCleaner).to(DirectoryCleaner);
container.bind<FileLoader>(TYPES.FileLoader).to(FileLoader);
container.bind<FilesystemFacade>(TYPES.FilesystemFacade).to(FilesystemFacade);
container.bind<Generator>(TYPES.Generator).to(Generator);
container.bind<OperationsParser>(TYPES.OperationsParser).to(OperationsParser);
container.bind<SpecFormatter>(TYPES.SpecFormatter).to(SpecFormatter);
container.bind<SpecResolver>(TYPES.SpecResolver).to(SpecResolver);

container.bind<Ejs>(TYPES.Ejs).toDynamicValue(() => require('ejs'));

export default container;
