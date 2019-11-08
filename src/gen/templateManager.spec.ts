import * as ejs from 'ejs';
import { loadAllTemplateFiles, render } from './templateManager';

const GOOD_FILE = 'client.ejs';

describe('loadAllTemplateFiles', () => {
  beforeEach(() => ejs.clearCache());
  it('should load all template files to the memory', async () => {
    loadAllTemplateFiles('axios');

    expect(ejs.cache).toBeDefined();
    expect(ejs.cache.get(GOOD_FILE)).toBeInstanceOf(Function);
  });

  it('should handle loading wrong template', async () => {
    expect(() => {
      loadAllTemplateFiles('non-existent');
    }).toThrowError('Could not found');
  });

  it('should handle empty template name', async () => {
    expect(() => {
      loadAllTemplateFiles('');
    }).toThrowError('No template');
  });

  it('should handle null template', async () => {
    expect(() => {
      loadAllTemplateFiles(null);
    }).toThrowError('No template');
  });

  it('actually clears EJS cache', async () => {
    loadAllTemplateFiles('axios');
    expect(ejs.cache.get(GOOD_FILE)).toBeDefined();

    ejs.clearCache();

    expect(ejs.cache.get(GOOD_FILE)).not.toBeDefined();
  });
});

describe('render', () => {
  beforeAll(() => {
    ejs.clearCache();
    loadAllTemplateFiles('axios');
  });

  it('should get existing template', async () => {
    const templateFunction = render(GOOD_FILE, {
      clientName: 'Test',
      baseUrl: null,
      operations: [],
    });

    expect(templateFunction).toContain('TestClient');
  });
});
