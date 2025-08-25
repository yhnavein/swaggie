import { test, describe } from 'node:test';
import assert from 'node:assert';

import { prepareJsDocsForOperation, renderComment } from './jsDocs';
import { assertEqualIgnoringWhitespace } from '../../test/test.utils';
import { IOperationParam } from './types';

describe('prepareJsDocsForOperation', () => {
  test('should return null if there are no docs and no params', () => {
    const op = {
      summary: '   ',
      description: '     ',
      deprecated: false,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assert.strictEqual(jsdocs, '');
  });

  test('should handle single line comment', () => {
    const op = {
      summary: 'test comment',
      deprecated: false,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assertEqualIgnoringWhitespace(jsdocs, `/** test comment */`);
  });

  test('should handle longer comment from operation summary', () => {
    const op = {
      summary: 'Single line comment',
      description: 'Additional description',
      deprecated: true,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assertEqualIgnoringWhitespace(
      jsdocs,
      `/**
  * Single line comment
  * Additional description
  * @deprecated
  */`
    );
  });

  test('should skip summary if it is a subset of description', () => {
    const op = {
      summary: 'Single line comment',
      description: 'Single line comment.\nAdditional description',
      deprecated: false,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assertEqualIgnoringWhitespace(
      jsdocs,
      `/**
  * Single line comment.
  * Additional description
  */`
    );
  });

  test('should handle long descriptions', () => {
    const op = {
      description:
        'Additional description\nWith multiple lines\n\n## Wow, some markdown\n - and some list\n - and **bold**\n - and `code`\n - and [link](https://example.com)',
      deprecated: true,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assertEqualIgnoringWhitespace(
      jsdocs,
      `/**
  * Additional description
  * With multiple lines
  *
  * ## Wow, some markdown
  * - and some list
  * - and **bold**
  * - and \`code\`
  * - and [link](https://example.com)
  * @deprecated
  */`
    );
  });

  test('should handle params alone', () => {
    const op = {
      summary: '',
      description: '',
      deprecated: false,
    };
    const params: IOperationParam[] = [
      {
        originalName: 'X-Param-1',
        name: 'param1',
        type: 'string',
        optional: false,
      },
      {
        originalName: 'X-Amz-Date',
        name: 'date',
        type: 'string',
        optional: true,
      },
    ];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assertEqualIgnoringWhitespace(
      jsdocs,
      `/**
  * @param param1 (API name: X-Param-1)
  * @param date (optional) (API name: X-Amz-Date)
  */`
    );
  });
});

describe('renderComment', () => {
  test('should render proper multiline comment with trimming', () => {
    const comment = `   Quite a lengthy comment
   With at least two lines    `;
    const res = renderComment(comment);

    assert.strictEqual(
      res,
      ` /**
  * Quite a lengthy comment
  * With at least two lines
  */`
    );
  });

  const testCases = [
    {
      comment: 'One liner',
      expected: '/** One liner */',
    },
    {
      comment: '   One liner   ',
      expected: '/** One liner */',
    },
    {
      comment: 'a <= b < c && d >= e > f',
      expected: '/** a &le; b &lt; c && d &ge; e &gt; f */',
    },
    {
      comment: null,
      expected: '',
    },
    {
      comment: undefined,
      expected: '',
    },
    {
      comment: '',
      expected: '',
    },
  ];

  for (const { comment, expected } of testCases) {
    test(`should render proper comment for "${comment}"`, () => {
      const res = renderComment(comment);

      assert.strictEqual(res, expected);
    });
  }

  test('should handle HTML tags in description', () => {
    const op = {
      description:
        '<h1>Title</h1>\n\n<p>Some description</p><br><p>Some more description</p><br/>\nOh, <a href="https://example.com">link</a> and some <strong>bold</strong> text<br/>\n<i>Italics</i> as well as <code>code</code> or <em>emphasis</em> or <pre>pre</pre>',
      deprecated: true,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assertEqualIgnoringWhitespace(
      jsdocs,
      ` /**
  * # Title
  *
  * Some description
  *
  * Some more description
  *
  * Oh, [link](https://example.com) and some **bold** text
  *
  * *Italics* as well as \`code\` or *emphasis* or \`pre\`
  * @deprecated
  */`
    );
  });

  test('should handle unknown or unclosed tags as well', () => {
    const op = {
      description:
        '<title>Title</title><brief explanation>\nSome description\n</brief explanations>\n<pre> and <code> and <i> and <em> and <strong> and <a>like this</a>',
      deprecated: false,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assert.strictEqual(
      jsdocs,
      ` /**
  * &lt;title&gt;Title&lt;/title&gt;&lt;brief explanation&gt;
  * Some description
  * &lt;/brief explanations&gt;
  * &lt;pre&gt; and &lt;code&gt; and &lt;i&gt; and &lt;em&gt; and &lt;strong&gt; and &lt;a&gt;like this&lt;/a&gt;
  */`
    );
  });

  test('should handle title tags', () => {
    const op = {
      description:
        '<h1>Title</h1>\n<h2>Subtitle</h2><h3>Subsubtitle</h3><h4>Subsubsubtitle</h4>\n<h5>Subsubsubsubtitle</h5>\n<h6>Subsubsubsubsubtitle</h6>',
      deprecated: false,
    };
    const params: IOperationParam[] = [];
    const jsdocs = prepareJsDocsForOperation(op, params);

    assert.strictEqual(
      jsdocs,
      ` /**
  * # Title
  *
  * ## Subtitle
  * ### Subsubtitle
  * #### Subsubsubtitle
  *
  * ##### Subsubsubsubtitle
  *
  * ###### Subsubsubsubsubtitle
  */`
    );
  });
});
