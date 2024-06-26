import { dset as set } from 'dset';
import { join, uniq } from '../util';
import { getParameterType } from './support';
import type { IQueryDefinitions } from './models';
import type { ApiSpec, ClientOptions } from '../../types';

export default function genTypes(
  spec: ApiSpec,
  queryDefinitions: IQueryDefinitions,
  options: ClientOptions
) {
  const lines = [];
  join(lines, renderDefinitions(spec, queryDefinitions, options));

  return lines.join('\n');
}

function renderDefinitions(
  spec: ApiSpec,
  queryDefinitions: IQueryDefinitions,
  options: ClientOptions
): string[] {
  const defs = unwrapDefinitions({
    ...(spec.definitions || {}),
    ...queryDefinitions,
  });
  const typeLines = [];
  const docLines = [];
  const nonGenericTypes = Object.keys(defs).filter((k) => k.indexOf('[') === -1);
  const genericTypes = Object.keys(defs).filter((k) => k.indexOf('[') > -1);
  const uniqGenericTypes = getDistinctGenericTypes(genericTypes);

  nonGenericTypes.forEach((name) => {
    const def = defs[name];
    join(typeLines, renderTsType(name, def, options));
  });

  uniqGenericTypes.forEach((name) => {
    const realKey = genericTypes.filter((t) => t.indexOf(name) === 0).pop();
    const def = defs[realKey];
    const genericName = name + '<T>';
    const typeToBeGeneric = realKey.substring(realKey.indexOf('[') + 1, realKey.indexOf(']'));
    join(typeLines, renderTsType(genericName, def, options, typeToBeGeneric));
  });

  return typeLines.concat(docLines);
}

function renderTsType(name, def, options: ClientOptions, typeToBeGeneric?: string) {
  if (def.allOf) {
    return renderTsInheritance(name, def.allOf, options);
  }
  if (!isSupportedDefType(def)) {
    console.warn(`Unable to render ${name} ${def.type}, skipping.`);
    return [];
  }

  const lines = [];
  if (def.description) {
    lines.push(renderComment(def.description));
  }

  if (def['x-enumNames']) {
    lines.push(renderXEnumType(name, def));
    return lines;
  }
  if (def.enum) {
    lines.push(renderEnumType(name, def));
    return lines;
  }
  lines.push(`export interface ${name} {`);

  const required = def.required || [];
  const props = Object.keys(def.properties || {});
  const requiredProps = props.filter((p) => !!~required.indexOf(p));
  const optionalProps = props.filter((p) => !~required.indexOf(p));

  if (def.queryParam) {
    const res = renderQueryStringParameters(def, options);
    join(lines, res);
  } else {
    const requiredPropLines = requiredProps
      .map((prop) => renderTsTypeProp(prop, def.properties[prop], true, options, typeToBeGeneric))
      .reduce((a, b) => a.concat(b), []);

    const optionalPropLines = optionalProps
      .filter((p) => !def.properties[p].readOnly)
      .map((prop) => renderTsTypeProp(prop, def.properties[prop], false, options, typeToBeGeneric))
      .reduce((a, b) => a.concat(b), []);

    join(lines, requiredPropLines);
    join(lines, optionalPropLines);
  }
  lines.push('}\n');
  return lines;
}

/**
 * Types coming from query models are different and they need to support nesting. Examples:
 * @example
 * 'parameters.filter.name': string, 'parameters.filter.query': string
 * Will need to become:
 * @example
 * {
 *  parameters: {
 *    filter: { name: string, query: string }
 *  }
 * }
 */
export function renderQueryStringParameters(def: any, options: ClientOptions): string[] {
  const props = Object.keys(def.properties).map((e) => ({
    key: e,
    name: def.properties[e].name,
    parts: def.properties[e].name.split('.'),
  }));
  const objNotation = {};
  props.forEach((p) => set(objNotation, p.name, def.properties[p.key]));

  return processQueryStringParameter(objNotation, null, options);
}

function processQueryStringParameter(
  props: any,
  containerName: string | null,
  options: ClientOptions
): string[] {
  if (!props) {
    return [];
  }
  if (!!props.in && !!props.name) {
    const lastName = props.name.split('.').pop();
    return renderTsTypeProp(lastName, props, props.required, options);
  }
  const arr = Object.keys(props).map((p) => {
    return processQueryStringParameter(props[p], p, options).join('\n');
  });

  if (containerName) {
    return [`${containerName}?: {`, ...arr, '}'];
  }
  return arr;
}

/** Basically only object and (x-)enum types are supported */
function isSupportedDefType(def: any) {
  return def.type === 'object' || !!def['x-enumNames'] || !!def.enum;
}

function renderXEnumType(name: string, def: any) {
  const isString = def.type === 'string';
  let res = `export enum ${name} {\n`;
  const enumNames = def['x-enumNames'] as string[];
  const enumValues = (def.enum as any[]).map((el) => (isString ? `"${el}"` : el));

  for (let index = 0; index < enumNames.length; index++) {
    res += `  ${enumNames[index]} = ${enumValues[index]},\n`;
  }
  res += '}\n';
  return res;
}

function renderEnumType(name: string, def: any) {
  if (def.fullEnum) {
    const enumKeys = Object.keys(def.fullEnum).map((k) => `  ${k} = ${def.fullEnum[k]},`);
    return `export enum ${name} {
${enumKeys.join('\n')}
}\n`;
  }

  const values = (def.enum as any[]).map((v) => (typeof v === 'number' ? v : `'${v}'`)).join(' | ');
  return `export type ${name} = ${values};\n`;
}

function renderTsInheritance(name: string, allOf: any[], options: ClientOptions) {
  verifyAllOf(name, allOf);
  const ref = allOf[0];
  const parentName = ref.$ref.split('/').pop();
  const lines = renderTsType(name, allOf[1], options);
  const interfaceLineIndex = lines.findIndex((l) => l.indexOf('export interface') === 0);
  if (interfaceLineIndex > -1) {
    // Let's replace generic interface definition with more specific one with inheritance info
    lines[interfaceLineIndex] = `export interface ${name} extends ${parentName} {`;
  }
  return lines;
}

function renderTsTypeProp(
  prop: string,
  info: any,
  required: boolean,
  options: ClientOptions,
  typeToBeGeneric?: string
): string[] {
  const lines = [];
  let type = getParameterType(info, options);
  if (typeToBeGeneric && type.indexOf(typeToBeGeneric) === 0) {
    type = type.replace(typeToBeGeneric, 'T');
  }
  if (info.description) {
    lines.push(renderComment(info.desciption));
  }
  const req = required ? '' : '?';
  lines.push(`  ${prop}${req}: ${type};`);

  return lines;
}

function verifyAllOf(name: string, allOf: any[]) {
  // Currently we interpret allOf as inheritance. Not strictly correct
  // but seems to be how most model inheritance in Swagger and is consistent
  // with other code generation tool
  if (!allOf || allOf.length !== 2) {
    console.log(allOf);
    throw new Error(
      `Json schema allOf '${name}' must have two elements to be treated as inheritance`
    );
  }
  const ref = allOf[0];
  if (!ref.$ref) {
    throw new Error(`Json schema allOf '${name}' first element must be a $ref ${ref}`);
  }
}

function getDistinctGenericTypes(keys: string[]) {
  const sanitizedKeys = keys.map((k) => k.substring(0, k.indexOf('[')));
  return uniq(sanitizedKeys);
}

function unwrapDefinitions(definitions: any) {
  const result: any = {};

  for (const definitionKey of Object.keys(definitions)) {
    const def = definitions[definitionKey];
    if ('definitions' in def && typeof def.definitions === 'object') {
      Object.assign(result, unwrapDefinitions(def.definitions));
    }
    result[definitionKey] = def;
  }

  return result;
}

export function renderComment(comment: string | null) {
  if (!comment) {
    return null;
  }

  const commentLines = comment.split('\n');

  if (commentLines.length === 1) {
    return `// ${comment.trim()}`;
  }

  return ` /**\n${commentLines.map((line) => `  * ${line.trim()}`).join('\n')}\n  */`;
}
