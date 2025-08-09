import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { loadAllTemplateFiles, renderFile } from './templateManager';

const GOOD_FILE = 'client.ejs';

describe('loadAllTemplateFiles', () => {
  test('should handle loading wrong template', () => {
    assert.throws(() => {
      loadAllTemplateFiles('non-existent');
    }, /Could not found/);
  });

  test('should handle empty template name', () => {
    assert.throws(() => {
      loadAllTemplateFiles('');
    }, /No template/);
  });

  test('should handle null template', () => {
    assert.throws(() => {
      loadAllTemplateFiles(null);
    }, /No template/);
  });
});

describe('render', () => {
  beforeEach(() => {
    loadAllTemplateFiles('axios');
  });

  test('should get existing template', () => {
    const templateFunction = renderFile(GOOD_FILE, {
      clientName: 'Test',
      camelCaseName: 'test',
      baseUrl: null,
      operations: [],
    });

    assert(templateFunction.includes('testClient'));
  });

  test('should render template that is complex (multiple levels of includes)', () => {
    const templateFunction = renderFile(GOOD_FILE, {
      clientName: 'Test',
      camelCaseName: 'test',
      baseUrl: null,
      operations: [
        {
          parameters: [],
          name: 'TestName',
          returnType: 'string',
          responseContentType: 'json',
          url: 'api/test',
          method: 'GET',
          formData: [],
          body: null,
          query: null,
          headers: null,
        },
      ],
    });

    assert(templateFunction.includes('testClient'));
    assert(templateFunction.includes('TestName'));
  });
});

describe('custom templates', () => {
  const tempDir = `${os.tmpdir()}/custom-template`;

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    fs.copyFileSync(
      path.join(__dirname, '..', '..', 'templates', 'fetch', 'client.ejs'),
      path.join(tempDir, 'client.ejs')
    );

    loadAllTemplateFiles(tempDir);
  });

  test('should handle custom template', () => {
    const templateFunction = renderFile('client.ejs', {
      clientName: 'Test',
      camelCaseName: 'test',
      baseUrl: null,
      operations: [],
    });

    assert(templateFunction.includes('testClient'));
  });

  afterEach(() => {
    fs.unlinkSync(path.join(tempDir, 'client.ejs'));
    fs.rmdirSync(tempDir);
  });
});
