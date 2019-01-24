import { ContainerModule } from 'inversify';
import { TYPES, Ejs, Lodash } from './types';

export const externalsModule = new ContainerModule((bind) => {
  bind<Set<any>>(TYPES.SetFactory).toDynamicValue(() => new Set());
  bind<Ejs>(TYPES.Ejs).toDynamicValue(() => require('ejs'));
});
