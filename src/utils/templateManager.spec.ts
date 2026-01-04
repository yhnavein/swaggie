import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { test, describe, beforeEach, afterEach, expect } from 'bun:test';

import { loadAllTemplateFiles, renderFile } from './templateManager';

const GOOD_FILE = 'client.ejs';

describe('loadAllTemplateFiles', () => {
  test('should handle loading wrong template', () => {
    expect(() => loadAllTemplateFiles('non-existent')).toThrow(/Could not find/);
  });

  test('should handle empty template name', () => {
    expect(() => {
      loadAllTemplateFiles('');
    }).toThrow(/No template/);
  });

  test('should handle null template', () => {
    expect(() => {
      loadAllTemplateFiles(null);
    }).toThrow(/No template/);
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

    expect(templateFunction).toContain('testClient');
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

    expect(templateFunction).toContain('testClient');
    expect(templateFunction).toContain('TestName');
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

    expect(templateFunction).toContain('testClient');
  });

  afterEach(() => {
    fs.unlinkSync(path.join(tempDir, 'client.ejs'));
    fs.rmdirSync(tempDir);
  });
});
