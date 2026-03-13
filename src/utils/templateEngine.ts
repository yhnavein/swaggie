import { Eta } from 'eta';

let engine: Eta;

export function initTemplateEngineFromDirectory(templatesDir: string) {
  engine = new Eta({ views: templatesDir });
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
