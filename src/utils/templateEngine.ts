import { Eta } from 'eta';

let engine: Eta;
let loadedFiles: Record<string, string> | null = null;

export function initTemplateEngineFromDirectory(templatesDir: string) {
  engine = new Eta({ views: templatesDir });
  loadedFiles = null;
}

export function initTemplateEngineFromBundled(templateFiles: Record<string, string>) {
  engine = new Eta({ views: '.' });
  engine.resolvePath = (template) => template;
  engine.readFile = (templatePath) => {
    const directMatch = templateFiles[templatePath];
    if (directMatch !== undefined) {
      return directMatch;
    }

    const baseName = templatePath.split('/').pop()?.split('\\').pop() ?? templatePath;
    return templateFiles[baseName];
  };
  loadedFiles = templateFiles;
}

/**
 * Returns true if the given template file is available in the currently loaded
 * bundled template store.  Always returns false when using a directory-based
 * engine (filesystem templates are checked via renderFile directly).
 */
export function hasTemplateFile(templateFile: string): boolean {
  if (!loadedFiles) {
    return false;
  }
  return (
    templateFile in loadedFiles ||
    Object.keys(loadedFiles).some((k) => k.split('/').pop()?.split('\\').pop() === templateFile)
  );
}

/**
 * Get's a template file and renders it with the provided data.
 */
export function renderFile(templateFile: string, data: object = {}) {
  if (!engine) {
    throw new Error('Template engine has not been initialized');
  }

  return engine.render(templateFile, data);
}
