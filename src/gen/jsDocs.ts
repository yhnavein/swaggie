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

/**
 * Strips specific HTML tags and converts them to a simple markdown.
 * Unknown or unclosed tags are encoded to HTML entities.
 * @param str - The string to strip the tags from.
 */
function stripSpecificHtmlTags(str: string) {
  // Replace specific problematic tags with better alternatives
  return (
    str
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p(\s[^>]*)?>/gi, '')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre>(.*?)<\/pre>/gi, '`$1`')
      // Replace h1 - h6 with markdown headers
      .replace(
        /<h([1-6])>(.*?)<\/h\1>/gi,
        (match, level, content) => '#'.repeat(parseInt(level)) + ' ' + content + '\n'
      )
      // Replace links with markdown links
      .replace(/<a href="([^"]+)">([^<]+)<\/a>/gi, '[$2]($1)')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\<=/g, '&le;')
      .replace(/\>=/g, '&ge;')
      .replace(/\</g, '&lt;')
      .replace(/\>/g, '&gt;')
      .trim()
  );
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

  const mdComment = stripSpecificHtmlTags(comment);
  const commentLines = mdComment.split('\n');

  if (commentLines.length === 1) {
    return `/** ${mdComment.trim()} */`;
  }

  return ` /**\n${commentLines
    .map((line) => (line.trim() === '' ? '  *' : `  * ${line.trim()}`))
    .join('\n')}\n  */`;
}
