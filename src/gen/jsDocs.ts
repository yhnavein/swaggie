import { ApiOperation } from '../types';
import { IOperationParam } from './types';

/**
 * Prepares content for the operation docs. We will use description and summary if they are defined
 * in the spec. Additionally we will add deprecation tag if the operation is deprecated.
 * This function should include JSDocs asterisks to make comments look nice.
 */
function getOperationDocs(
  op: Pick<ApiOperation, 'summary' | 'description' | 'deprecated'>
): string[] {
  const result = [];
  const summary = op.summary?.trim();
  const description = op.description?.trim();
  if (summary) {
    result.push(summary);
  }
  if (description && description !== summary) {
    result.push(description);
  }
  if (op.deprecated) {
    result.push('@deprecated');
  }
  return result;
}

export function prepareJsDocsForOperation(
  op: Pick<ApiOperation, 'summary' | 'description' | 'deprecated'>,
  params: IOperationParam[]
) {
  const docs = getOperationDocs(op);
  if (docs.length === 0 && params.length === 0) {
    return null;
  }

  const result = docs;
  for (const param of params) {
    const paramLine = `@param ${param.name} ${param.optional ? '(optional)' : ''} ${
      param.name !== param.originalName ? `(API name: ${param.originalName})` : ''
    }`;
    result.push(paramLine);
  }
  return renderComment(result.join('\n'));
}

export function renderComment(comment: string | null) {
  if (!comment) {
    return null;
  }

  const commentLines = comment.split('\n');

  if (commentLines.length === 1) {
    return `/** ${comment.trim()} */`;
  }

  return ` /**\n${commentLines.map((line) => `  * ${line.trim()}`).join('\n')}\n  */`;
}
