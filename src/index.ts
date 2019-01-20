import { Container } from 'inversify';
import { configureIoc } from './ioc/configure-ioc';
import { TYPES } from './ioc/types';
import { Generator } from './generator';

const container = new Container();
configureIoc(container);
export const generator = container.get<Generator>(TYPES.Generator);
