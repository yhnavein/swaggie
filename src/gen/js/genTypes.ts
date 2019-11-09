import { join } from '../util';
import { DOC, SP, getDocType, getTSParamType } from './support';
import { uniq } from 'lodash';

export default function genTypes(spec: ApiSpec, options: ClientOptions) {
  const lines = [];
  join(lines, renderDefinitions(spec, options));

  return  lines.join('\n');
}

function renderDefinitions(spec: ApiSpec, options: ClientOptions): string[] {
  const defs = spec.definitions || {};
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
    lines.push(`/**`);
    lines.push(DOC + def.description.trim().replace(/\n/g, `\n${DOC}${SP}`));
    lines.push(` */`);
  }
  if (!!def['x-enumNames']) {
    lines.push(renderXEnumType(name, def));
    return lines;
  }
  lines.push(`export interface ${name} {`);

  const required = def.required || [];
  const props = Object.keys(def.properties || {});
  const requiredProps = props.filter((p) => !!~required.indexOf(p));
  const optionalProps = props.filter((p) => !~required.indexOf(p));

  const requiredPropLines = requiredProps
    .map((prop) => renderTsTypeProp(prop, def.properties[prop], true, options, typeToBeGeneric))
    .reduce((a, b) => a.concat(b), []);

  const optionalPropLines = optionalProps
    .map((prop) => renderTsTypeProp(prop, def.properties[prop], false, options, typeToBeGeneric))
    .reduce((a, b) => a.concat(b), []);

  join(lines, requiredPropLines);
  join(lines, optionalPropLines);
  lines.push('}');
  lines.push('');
  return lines;
}

/** Basically only object and x-enum types are supported */
function isSupportedDefType(def: any) {
  return def.type === 'object' || !!def['x-enumNames'];
}

function renderXEnumType(name: string, def: any) {
  let res = `export enum ${name} {\n`;
  const enumNames = def['x-enumNames'] as string[];
  const enumValues = def.enum as any[];

  for (let index = 0; index < enumNames.length; index++) {
    res += `  ${enumNames[index]} = ${enumValues[index]},\n`;
  }
  res += '}\n';
  return res;
}

function renderTsInheritance(name: string, allOf: any[], options: ClientOptions) {
  verifyAllOf(name, allOf);
  const ref = allOf[0];
  const parentName = ref.$ref.split('/').pop();
  const lines = renderTsType(name, allOf[1], options);
  if (lines[0].startsWith('export interface')) {
    lines.shift();
  }
  lines.unshift(`export interface ${name} extends ${parentName} {`);
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
  let type = getTSParamType(info, options);
  if (typeToBeGeneric && type.indexOf(typeToBeGeneric) === 0) {
    type = type.replace(typeToBeGeneric, 'T');
  }
  if (info.description) {
    lines.push(`${SP}/**`);
    lines.push(
      `${SP}${DOC}` + (info.description || '').trim().replace(/\n/g, `\n${SP}${DOC}${SP}`)
    );
    lines.push(`${SP} */`);
  }
  const req = required ? '' : '?';
  lines.push(`${SP}${prop}${req}: ${type};`);
  return lines;
}

function renderTypeDoc(name: string, def: any): string[] {
  if (def.allOf) {
    return renderDocInheritance(name, def.allOf);
  }
  if (def.type !== 'object') {
    console.warn(`Unable to render ${name} ${def.type}, skipping.`);
    return [];
  }

  const lines = ['/**', `${DOC}@typedef ${name}`];
  const req = def.required || [];
  const propLines = Object.keys(def.properties).map((prop) => {
    const info = def.properties[prop];
    const description = (info.description || '').trim().replace(/\n/g, `\n${DOC}${SP}`);
    return `${DOC}@property {${getDocType(info)}} ${prop} ${description}`;
  });
  if (propLines.length) {
    lines.push(`${DOC}`);
  }
  join(lines, propLines);
  lines.push(' */');
  lines.push('');
  return lines;
}

function renderDocInheritance(name: string, allOf: any[]) {
  verifyAllOf(name, allOf);
  const ref = allOf[0];
  const parentName = ref.$ref.split('/').pop();
  const lines = renderTypeDoc(name, allOf[1]);
  lines.splice(3, 0, `${DOC}@extends ${parentName}`);
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
