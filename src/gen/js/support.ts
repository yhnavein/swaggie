export const DOC = ' * ';
export const DEFAULT_SP = '  ';
export let SP = DEFAULT_SP;

export function formatDocDescription(description: string): string {
  return (description || '').trim().replace(/\n/g, `\n${DOC}${SP}`);
}

export function getDocType(param: any, options?: ClientOptions): string {
  if (!param) {
    return 'object';
  } else if (param.$ref) {
    const type = param.$ref.split('/').pop();
    return `module:${type}`;
  } else if (param.schema) {
    return getDocType(param.schema, options);
  } else if (param['x-schema']) {
    return getDocType(param['x-schema'], options);
  } else if (param.type === 'array') {
    if (param.items.type) {
      return `${getDocType(param.items, options)}[]`;
    } else if (param.items.$ref) {
      const type = param.items.$ref.split('/').pop();
      return `module:${type}[]`;
    } else {
      return 'object[]';
    }
  } else if (param.type === 'integer' || param.type === 'number') {
    return 'number';
  } else if (param.type === 'string' && (param.format === 'date-time' || param.format === 'date')) {
    return options && options.dateFormat === 'string' ? 'string' : 'Date';
  } else if (param.type === 'string') {
    return 'string';
  } else if (param.type === 'boolean') {
    return 'boolean';
  } else {
    return 'object';
  }
}

export function getTSParamType(param: any, options: ClientOptions): string {
  const unknownType = options.preferAny ? 'any' : 'unknown';

  if (!param) {
    return unknownType;
  }
  if (param.enum) {
    if (!param.type || param.type === 'string') {
      return `'${param.enum.join(`'|'`)}'`;
    } else if (param.type === 'integer' || param.type === 'number') {
      return `${param.enum.join(`|`)}`;
    }
  }
  if (param.$ref) {
    const type = param.$ref.split('/').pop();
    return handleGenerics(type);
  } else if (param.schema) {
    return getTSParamType(param.schema, options);
  } else if (param['x-schema']) {
    return getTSParamType(param['x-schema'], options);
  } else if (param.type === 'array') {
    if (param.items.type) {
      if (param.items.enum) {
        return `(${getTSParamType(param.items, options)})[]`;
      } else {
        return `${getTSParamType(param.items, options)}[]`;
      }
    } else if (param.items.$ref) {
      const type = param.items.$ref.split('/').pop();
      return handleGenerics(type) + '[]';
    } else {
      return unknownType + '[]';
    }
  } else if (param.type === 'object') {
    if (param.additionalProperties) {
      const extraProps = param.additionalProperties;
      return `{ [key: string]: ${getTSParamType(extraProps, options)} }`;
    }
    return unknownType;
  } else if (param.type === 'integer' || param.type === 'number') {
    return 'number';
  } else if (param.type === 'string' && (param.format === 'date-time' || param.format === 'date')) {
    return options.dateFormat === 'string' ? 'string' : 'Date';
  } else if (param.type === 'string') {
    return 'string';
  } else if (param.type === 'file') {
    return 'File';
  } else if (param.type === 'boolean') {
    return 'boolean';
  } else {
    return unknownType;
  }
}

function handleGenerics(type: string) {
  if (!/^\w+\[\w+\]/.test(type)) {
    return type;
  }

  // const fixedType = type.replace(/\[/g, '<').replace(/\]/g, '>');
  const parts = type.split('[');
  return parts.join('<').replace(/\]/g, '>');
}
