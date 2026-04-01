import type { L1Template, L2Template, ResolvedTemplate, TemplateInput } from '../types';

const L1_TEMPLATES: readonly L1Template[] = ['axios', 'fetch', 'xior', 'ng1', 'ng2'];
const L2_TEMPLATES: readonly L2Template[] = ['swr', 'tsq'];

/** L1 templates that are incompatible with any L2 (framework-specific clients) */
const L2_INCOMPATIBLE_L1: readonly L1Template[] = ['ng1', 'ng2'];

/** Legacy composite template names and their replacements */
const LEGACY_TEMPLATES: Record<string, [string, string]> = {
  'swr-axios': ['swr', 'axios'],
  'tsq-xior': ['tsq', 'xior'],
};

/** Default L1 to use when only an L2 template is specified */
const DEFAULT_L1_FOR_L2 = 'fetch';

export function isL1Template(name: string): name is L1Template {
  return (L1_TEMPLATES as readonly string[]).includes(name);
}

export function isL2Template(name: string): name is L2Template {
  return (L2_TEMPLATES as readonly string[]).includes(name);
}

/**
 * Validates that a raw template input is acceptable and throws a descriptive
 * error if not.  Does NOT normalize — call `normalizeTemplate` for that.
 *
 * Rules:
 * - Legacy composite names ('swr-axios', 'tsq-xior') → migration error
 * - Single L2 name → allowed (will be normalized to [L2, default-L1] later)
 * - Single L1 name or custom path → allowed
 * - Array with wrong element count → error
 * - Array where first element is not an L2 → error
 * - Array where second element is an incompatible L1 (ng1/ng2) → error
 */
export function validateTemplate(template: TemplateInput): void {
  if (Array.isArray(template)) {
    const arr = template as string[];
    if (arr.length !== 2) {
      throw new Error(
        `Invalid template: array must have exactly 2 elements [L2, L1], e.g. ["swr", "axios"]. Got ${arr.length} element(s).`
      );
    }

    const [l2, l1] = template;

    // First element must be an L2 template (or a custom path — we can't validate
    // custom paths statically, so we only reject known-bad L1 names here).
    if (isL1Template(l2)) {
      throw new Error(
        `Invalid template pair: "${l2}" is an L1 (HTTP client) template and cannot be used as the first element. ` +
          `The first element must be an L2 template (${L2_TEMPLATES.join(', ')}) or a custom path. ` +
          `To use "${l2}" alone, pass it as a string: template: "${l2}".`
      );
    }

    if (isL2Template(l2) && isL1Template(l1) && (L2_INCOMPATIBLE_L1 as string[]).includes(l1)) {
      throw new Error(
        `Invalid template pair: "${l1}" is a framework-specific client and is not compatible with L2 template "${l2}". ` +
          `Compatible L1 templates for L2 are: ${L1_TEMPLATES.filter((t) => !L2_INCOMPATIBLE_L1.includes(t)).join(', ')}.`
      );
    }

    return;
  }

  // Single string
  if (typeof template === 'string') {
    const legacy = LEGACY_TEMPLATES[template];
    if (legacy) {
      throw new Error(
        `"${template}" is no longer a valid template name. ` +
          `It has been split into separate L1 and L2 templates. ` +
          `Use template: ["${legacy[0]}", "${legacy[1]}"] instead.`
      );
    }
    // Single L2, single L1, or custom path are all fine — L2 alone gets a
    // default L1 applied during normalization.
  }
}

/**
 * Normalizes a validated template input into a `ResolvedTemplate`:
 * - Single L2 name → [L2, DEFAULT_L1_FOR_L2]
 * - Everything else passes through unchanged.
 *
 * Call `validateTemplate` before this function.
 */
export function normalizeTemplate(template: TemplateInput): ResolvedTemplate {
  if (typeof template === 'string' && isL2Template(template)) {
    return [template, DEFAULT_L1_FOR_L2];
  }
  return template as ResolvedTemplate;
}

/**
 * Returns the effective L1 template name from a resolved template.
 * For arrays, returns the second element; for single strings, returns the string.
 */
export function getL1Template(template: ResolvedTemplate): string {
  return Array.isArray(template) ? template[1] : template;
}
