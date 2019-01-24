import * as ejs from 'ejs';

export type Ejs = typeof ejs;

export const TYPES = {
  // Main
  CodeGenerator: Symbol('CodeGenerator'),
  DirectoryCleaner: Symbol('DirectoryCleaner'),
  FileLoader: Symbol('FileLoader'),
  FilesystemFacade: Symbol('FilesystemFacade'),
  Generator: Symbol('Generator'),
  OperationsParser: Symbol('OperationsParser'),
  SpecFormatter: Symbol('SpecFormatter'),
  SpecRefExpander: Symbol('SpecRefExpander'),
  SpecResolver: Symbol('SpecResolver'),

  // Externals
  SetFactory: Symbol('Factory<Set>'),
  Ejs: Symbol('Ejs'),
};
