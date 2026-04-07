import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { test, describe, beforeEach, afterEach, expect } from 'bun:test';

import { loadAllTemplateFiles, setBundledTemplates, mergeTemplateFiles } from './templateManager';
import { renderFile, hasTemplateFile } from './templateEngine';

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

describe('bundled templates', () => {
  afterEach(() => {
    setBundledTemplates(null);
  });

  test('should render template from bundled storage', () => {
    setBundledTemplates({
      bundled: {
        'client.ejs': 'Hello <%= it.name %>!',
      },
    });

    loadAllTemplateFiles('bundled');
    const templateResult = renderFile('client.ejs', { name: 'Swaggie' });

    expect(templateResult).toBe('Hello Swaggie!');
  });
});

describe('mergeTemplateFiles', () => {
  test('L2 files should override L1 files on filename conflicts', () => {
    const l1: Record<string, string> = {
      'baseClient.ejs': 'L1 base client',
      'client.ejs': 'L1 client',
      'operation.ejs': 'L1 operation',
      'barrel.ejs': 'L1 barrel',
    };
    const l2: Record<string, string> = {
      'baseClient.ejs': 'L2 reactive imports',
      'client.ejs': 'L2 client with hooks',
      'swrOperation.ejs': 'SWR operation partial',
    };

    const merged = mergeTemplateFiles(l1, l2);

    // L1's baseClient.ejs is preserved under the original key
    expect(merged['baseClient.ejs']).toBe('L1 base client');
    // L2's baseClient.ejs is stored as baseClientL2.ejs
    expect(merged['baseClientL2.ejs']).toBe('L2 reactive imports');
    // L2 wins for client.ejs
    expect(merged['client.ejs']).toBe('L2 client with hooks');
    // L1-only files are preserved
    expect(merged['operation.ejs']).toBe('L1 operation');
    expect(merged['barrel.ejs']).toBe('L1 barrel');
    // L2-only partials are added
    expect(merged['swrOperation.ejs']).toBe('SWR operation partial');
  });

  test('L1 files should be used when L2 does not override them', () => {
    const l1: Record<string, string> = {
      'operation.ejs': 'L1 operation',
      'barrel.ejs': 'L1 barrel',
    };
    const l2: Record<string, string> = {
      'client.ejs': 'L2 client',
    };

    const merged = mergeTemplateFiles(l1, l2);

    expect(merged['operation.ejs']).toBe('L1 operation');
    expect(merged['barrel.ejs']).toBe('L1 barrel');
    expect(merged['client.ejs']).toBe('L2 client');
  });
});

describe('composite template loading', () => {
  afterEach(() => {
    setBundledTemplates(null);
  });

  test('should load [L2, L1] pair from bundled store and expose baseClientL2.ejs', () => {
    setBundledTemplates({
      'my-l1': {
        'baseClient.ejs': 'L1 HTTP client code',
        'client.ejs': 'L1 client',
        'operation.ejs': 'L1 operation',
        'barrel.ejs': 'L1 barrel',
      },
      'my-l2': {
        'baseClient.ejs': 'L2 reactive imports',
        'client.ejs': 'L2 client with hooks',
        'hookOperation.ejs': 'hook partial',
      },
    });

    loadAllTemplateFiles(['my-l2', 'my-l1']);

    // L1 base client is available under normal name
    expect(renderFile('baseClient.ejs', {})).toBe('L1 HTTP client code');
    // L2 base client is available as baseClientL2.ejs
    expect(hasTemplateFile('baseClientL2.ejs')).toBe(true);
    expect(renderFile('baseClientL2.ejs', {})).toBe('L2 reactive imports');
    // L2 wins for client.ejs
    expect(renderFile('client.ejs', {})).toBe('L2 client with hooks');
    // L2-only partial is present
    expect(hasTemplateFile('hookOperation.ejs')).toBe(true);
    // L1 operation is preserved since L2 didn't override it
    expect(renderFile('operation.ejs', {})).toBe('L1 operation');
  });

  test('should load composite template where L1 is a filesystem path', () => {
    setBundledTemplates({
      'my-l2': {
        'baseClient.ejs': 'L2 reactive imports',
        'client.ejs': 'L2 client',
      },
    });

    // Use real axios template directory as L1
    const axiosDir = path.join(__dirname, '..', '..', 'templates', 'axios');
    loadAllTemplateFiles(['my-l2', axiosDir]);

    expect(hasTemplateFile('baseClientL2.ejs')).toBe(true);
    expect(renderFile('baseClientL2.ejs', {})).toBe('L2 reactive imports');
    // L1 operation from real axios directory should be available
    expect(hasTemplateFile('operation.ejs')).toBe(true);
  });
});
