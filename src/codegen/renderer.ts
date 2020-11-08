import fs from 'fs';
import ts from 'typescript';

export function parseFile(file: string) {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
}

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
});

export function printNode(node: ts.Node) {
  const file = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  return printer.printNode(ts.EmitHint.Unspecified, node, file);
}

export function printNodes(nodes: ts.Node[]) {
  const file = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  return nodes.map((node) => printer.printNode(ts.EmitHint.Unspecified, node, file)).join('\n');
}

export function printFile(sourceFile: ts.SourceFile) {
  return printer.printFile(sourceFile);
}
