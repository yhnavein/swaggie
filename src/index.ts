import { config } from './ioc';
import { TYPES } from './ioc/types';
import { Generator } from './generator';

export const generator = config.get<Generator>(TYPES.Generator);
