import fs from 'node:fs';
import path from 'node:path';
import { Eta } from 'eta';

let engine: Eta;

export function loadAllTemplateFiles(templateName: string | null) {
  if (!templateName) {
    throw new Error('No template name was provided');
  }

  const templatesDir = fs.existsSync(templateName)
    ? templateName
    : path.join(__dirname, '..', '..', 'templates', templateName);

  if (!fs.existsSync(templatesDir)) {
    throw new Error(
      `Could not found directory with the template (we tried ${templatesDir}). Template name is correct?`
    );
  }
  engine = new Eta({ views: templatesDir });
}

/**
 * Get's a template file and renders it with the provided data.
 */
export function renderFile(templateFile: string, data: object = {}) {
  return engine.render(templateFile, data);
}
