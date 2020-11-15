/** This method tries to fix potentially wrong out parameter given from commandline */
export function prepareOutputFilename(out: string): string {
  if (!out) {
    return null;
  }

  if (/\.[jt]sx?$/i.test(out)) {
    return out.replace(/[\\]/i, '/');
  }
  if (/[\/\\]$/i.test(out)) {
    return out.replace(/[\/\\]$/i, '') + '/index.ts';
  }
  return out.replace(/[\\]/i, '/') + '.ts';
}

const reservedWords = [
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
];

export function escapeReservedWords(name: string): string {
  let escapedName = name;

  if (reservedWords.indexOf(name) >= 0) {
    escapedName = '_' + name;
  }
  return escapedName;
}
