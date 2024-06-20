import type { ClientOptions } from '../../types';

export function getTSParamType(param: any, options: ClientOptions): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!param) {
    return unknownType;
  }
  if (param.enum && !param['x-schema'] && !param.fullEnum) {
    if (!param.type || param.type === 'string') {
      return `'${param.enum.join(`'|'`)}'`;
    }
    if (param.type === 'integer' || param.type === 'number') {
      return `${param.enum.join('|')}`;
    }
  }
  if (param.$ref) {
    const type = param.$ref.split('/').pop();
    return handleGenerics(type);
  }
  if (param.schema) {
    return getTSParamType(param.schema, options);
  }
  if (param['x-schema']) {
    return getTSParamType(param['x-schema'], options);
  }
  if (param.type === 'array') {
    if (param.items.type) {
      if (param.items.enum) {
        return `(${getTSParamType(param.items, options)})[]`;
      }
      return `${getTSParamType(param.items, options)}[]`;
    }
    if (param.items.$ref) {
      const type = param.items.$ref.split('/').pop();
      return `${handleGenerics(type)}[]`;
    }
    return `${unknownType}[]`;
  }
  if (param.type === 'object') {
    if (param.additionalProperties) {
      const extraProps = param.additionalProperties;
      return `{ [key: string]: ${getTSParamType(extraProps, options)} }`;
    }
    return unknownType;
  }
  if (param.type === 'integer' || param.type === 'number') {
    return 'number';
  }
  if (param.type === 'string' && (param.format === 'date-time' || param.format === 'date')) {
    return options.dateFormat === 'string' ? 'string' : 'Date';
  }
  if (param.type === 'string') {
    return 'string';
  }
  if (param.type === 'file') {
    return 'File';
  }
  if (param.type === 'boolean') {
    return 'boolean';
  }
  return unknownType;
}

function handleGenerics(type: string) {
  if (!/^\w+\[\w+\]/.test(type)) {
    return type;
  }

  // const fixedType = type.replace(/\[/g, '<').replace(/\]/g, '>');
  const parts = type.split('[');
  return parts.join('<').replace(/\]/g, '>');
}
