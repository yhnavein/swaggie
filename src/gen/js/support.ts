import { isBasicType } from '../util';

export const DOC = ' * ';
export const DEFAULT_SP = '  ';
export let SP = DEFAULT_SP;
export let ST = ''; // statement terminator

export function applyFormatOptions(options: ClientOptions) {
  if (options.semicolon) {
    ST = ';';
  }
}

export function formatDocDescription(description: string): string {
  return (description || '').trim().replace(/\n/g, `\n${DOC}${SP}`);
}

export function getDocType(param: any): string {
  if (!param) {
    return 'object';
  } else if (param.$ref) {
    const type = param.$ref.split('/').pop();
    return `module:types.${type}`;
  } else if (param.schema) {
    return getDocType(param.schema);
  } else if (param.type === 'array') {
    if (param.items.type) {
      return `${getDocType(param.items)}[]`;
    } else if (param.items.$ref) {
      const type = param.items.$ref.split('/').pop();
      return `module:types.${type}[]`;
    } else {
      return 'object[]';
    }
  } else if (param.type === 'integer' || param.type === 'number') {
    return 'number';
  } else if (param.type === 'string') {
    return 'string';
  } else if (param.type === 'boolean') {
    return 'boolean';
  } else if (param.type === 'string' && (param.format === 'date-time' || param.format === 'date')) {
    return 'Date';
  } else {
    return 'object';
  }
}

export function getTSParamType(param: any, inTypesModule: boolean, options: ClientOptions): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!param) {
    return unknownType;
  } else if (param.enum) {
    if (!param.type || param.type === 'string') {
      return `'${param.enum.join(`'|'`)}'`;
    } else if (param.type === 'number') {
      return `${param.enum.join(`|`)}`;
    }
  }
  if (param.$ref) {
    const type = param.$ref.split('/').pop();
    return handleGenerics(type, inTypesModule);
  } else if (param.schema) {
    return getTSParamType(param.schema, inTypesModule, options);
  } else if (param.type === 'array') {
    if (param.items.type) {
      if (param.items.enum) {
        return `(${getTSParamType(param.items, inTypesModule, options)})[]`;
      } else {
        return `${getTSParamType(param.items, inTypesModule, options)}[]`;
      }
    } else if (param.items.$ref) {
      const type = param.items.$ref.split('/').pop();
      return handleGenerics(type, inTypesModule) + '[]';
    } else {
      return unknownType + '[]';
    }
  } else if (param.type === 'object') {
    if (param.additionalProperties) {
      const extraProps = param.additionalProperties;
      return `{ [key: string]: ${getTSParamType(extraProps, inTypesModule, options)} }`;
    }
    return unknownType;
  } else if (param.type === 'integer' || param.type === 'number') {
    return 'number';
  } else if (param.type === 'string') {
    return 'string';
  } else if (param.type === 'boolean') {
    return 'boolean';
  } else if (param.type === 'string' && (param.format === 'date-time' || param.format === 'date')) {
    return 'Date';
  } else {
    return unknownType;
  }
}

function handleGenerics(type: string, inTypesModule: boolean) {
  if (!/^\w+\[\w+\]/.test(type)) {
    return (inTypesModule ? 'types.' : '') + type;
  }

  // const fixedType = type.replace(/\[/g, '<').replace(/\]/g, '>');
  const parts = type.split('[');
  return parts
    .map((p) => (p && inTypesModule && !isBasicType(p) ? 'types.' : '') + p)
    .join('<')
    .replace(/\]/g, '>');
}
