import { test, describe, expect } from 'bun:test';

import {
  validateTemplate,
  normalizeTemplate,
  isL1Template,
  isL2Template,
  getL1Template,
} from './templateValidator';

describe('isL1Template', () => {
  test('should return true for all L1 templates', () => {
    expect(isL1Template('axios')).toBe(true);
    expect(isL1Template('fetch')).toBe(true);
    expect(isL1Template('xior')).toBe(true);
    expect(isL1Template('ng1')).toBe(true);
    expect(isL1Template('ng2')).toBe(true);
  });

  test('should return false for L2 templates', () => {
    expect(isL1Template('swr')).toBe(false);
    expect(isL1Template('tsq')).toBe(false);
  });

  test('should return false for unknown names', () => {
    expect(isL1Template('unknown')).toBe(false);
    expect(isL1Template('')).toBe(false);
  });
});

describe('isL2Template', () => {
  test('should return true for all L2 templates', () => {
    expect(isL2Template('swr')).toBe(true);
    expect(isL2Template('tsq')).toBe(true);
  });

  test('should return false for L1 templates', () => {
    expect(isL2Template('axios')).toBe(false);
    expect(isL2Template('fetch')).toBe(false);
  });

  test('should return false for unknown names', () => {
    expect(isL2Template('unknown')).toBe(false);
  });
});

describe('validateTemplate', () => {
  describe('single string — valid cases', () => {
    test('should accept all L1 template names', () => {
      expect(() => validateTemplate('axios')).not.toThrow();
      expect(() => validateTemplate('fetch')).not.toThrow();
      expect(() => validateTemplate('xior')).not.toThrow();
      expect(() => validateTemplate('ng1')).not.toThrow();
      expect(() => validateTemplate('ng2')).not.toThrow();
    });

    test('should accept L2 template names (normalized later)', () => {
      expect(() => validateTemplate('swr')).not.toThrow();
      expect(() => validateTemplate('tsq')).not.toThrow();
    });

    test('should accept custom filesystem paths', () => {
      expect(() => validateTemplate('/my/custom/template')).not.toThrow();
      expect(() => validateTemplate('./relative/path')).not.toThrow();
    });
  });

  describe('single string — legacy names', () => {
    test('should throw a migration error for "swr-axios"', () => {
      expect(() => validateTemplate('swr-axios')).toThrow(
        '"swr-axios" is no longer a valid template name'
      );
      expect(() => validateTemplate('swr-axios')).toThrow('["swr", "axios"]');
    });

    test('should throw a migration error for "tsq-xior"', () => {
      expect(() => validateTemplate('tsq-xior')).toThrow(
        '"tsq-xior" is no longer a valid template name'
      );
      expect(() => validateTemplate('tsq-xior')).toThrow('["tsq", "xior"]');
    });
  });

  describe('array — valid cases', () => {
    test('should accept [L2, L1] pairs with compatible L1 templates', () => {
      expect(() => validateTemplate(['swr', 'axios'])).not.toThrow();
      expect(() => validateTemplate(['swr', 'fetch'])).not.toThrow();
      expect(() => validateTemplate(['swr', 'xior'])).not.toThrow();
      expect(() => validateTemplate(['tsq', 'axios'])).not.toThrow();
      expect(() => validateTemplate(['tsq', 'fetch'])).not.toThrow();
      expect(() => validateTemplate(['tsq', 'xior'])).not.toThrow();
    });

    test('should accept custom path pairs', () => {
      expect(() => validateTemplate(['/my/l2', '/my/l1'])).not.toThrow();
    });
  });

  describe('array — invalid cases', () => {
    test('should throw when array has wrong number of elements', () => {
      expect(() => validateTemplate([] as any)).toThrow(
        'array must have exactly 2 elements'
      );
      expect(() => validateTemplate(['swr'] as any)).toThrow(
        'array must have exactly 2 elements'
      );
      expect(() => validateTemplate(['swr', 'axios', 'fetch'] as any)).toThrow(
        'array must have exactly 2 elements'
      );
    });

    test('should throw when first element is a known L1 template', () => {
      expect(() => validateTemplate(['axios', 'fetch'])).toThrow(
        '"axios" is an L1 (HTTP client) template and cannot be used as the first element'
      );
      expect(() => validateTemplate(['fetch', 'xior'])).toThrow(
        '"fetch" is an L1 (HTTP client) template and cannot be used as the first element'
      );
    });

    test('should throw when L2 is paired with ng1', () => {
      expect(() => validateTemplate(['swr', 'ng1'])).toThrow(
        '"ng1" is a framework-specific client and is not compatible with L2 template "swr"'
      );
    });

    test('should throw when L2 is paired with ng2', () => {
      expect(() => validateTemplate(['tsq', 'ng2'])).toThrow(
        '"ng2" is a framework-specific client and is not compatible with L2 template "tsq"'
      );
    });
  });
});

describe('normalizeTemplate', () => {
  test('should pass through L1 templates unchanged', () => {
    expect(normalizeTemplate('axios')).toBe('axios');
    expect(normalizeTemplate('fetch')).toBe('fetch');
    expect(normalizeTemplate('xior')).toBe('xior');
    expect(normalizeTemplate('ng1')).toBe('ng1');
    expect(normalizeTemplate('ng2')).toBe('ng2');
  });

  test('should normalize "swr" to ["swr", "fetch"]', () => {
    expect(normalizeTemplate('swr')).toEqual(['swr', 'fetch']);
  });

  test('should normalize "tsq" to ["tsq", "fetch"]', () => {
    expect(normalizeTemplate('tsq')).toEqual(['tsq', 'fetch']);
  });

  test('should pass through [L2, L1] arrays unchanged', () => {
    expect(normalizeTemplate(['swr', 'axios'])).toEqual(['swr', 'axios']);
    expect(normalizeTemplate(['tsq', 'xior'])).toEqual(['tsq', 'xior']);
  });

  test('should pass through custom paths unchanged', () => {
    expect(normalizeTemplate('/my/custom')).toBe('/my/custom');
  });
});

describe('getL1Template', () => {
  test('should return the string itself for single templates', () => {
    expect(getL1Template('axios')).toBe('axios');
    expect(getL1Template('fetch')).toBe('fetch');
    expect(getL1Template('/custom/path')).toBe('/custom/path');
  });

  test('should return the second element for array templates', () => {
    expect(getL1Template(['swr', 'axios'])).toBe('axios');
    expect(getL1Template(['tsq', 'xior'])).toBe('xior');
    expect(getL1Template(['swr', 'fetch'])).toBe('fetch');
  });
});
