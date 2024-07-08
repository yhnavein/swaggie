import { expect } from 'chai';

/** This file tests a code that will be generated and is hardcoded into the templates */

function paramsSerializer<T = any>(params: T, parentKey: string | null = null): string {
  if (params === undefined || params === null) return '';
  const encodedParams: string[] = [];
  const encodeValue = (value: any) =>
    encodeURIComponent(value instanceof Date && !Number.isNaN(value) ? value.toISOString() : value);

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = (params as any)[key];
      if (value !== undefined) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        if (Array.isArray(value)) {
          for (const element of value) {
            encodedParams.push(`${encodeURIComponent(fullKey)}=${encodeValue(element)}`);
          }
        } else if (value instanceof Date && !Number.isNaN(value)) {
          // If the value is a Date, convert it to ISO format
          encodedParams.push(`${encodeURIComponent(fullKey)}=${encodeValue(value)}`);
        } else if (typeof value === 'object') {
          // If the value is an object or array, recursively encode its contents
          const result = paramsSerializer(value, fullKey);
          if (result !== '') encodedParams.push(result);
        } else {
          // Otherwise, encode the key-value pair
          encodedParams.push(`${encodeURIComponent(fullKey)}=${encodeValue(value)}`);
        }
      }
    }
  }

  return encodedParams.join('&');
}

const date = new Date('2020-04-16T00:00:00.000Z');

describe('paramsSerializer', () => {
  const testCases = [
    { input: '', expected: '' },
    { input: null, expected: '' },
    { input: undefined, expected: '' },
    { input: {}, expected: '' },
    { input: { a: 1, b: 'test' }, expected: 'a=1&b=test' },
    { input: { a: 1, b: [1, 2, 3, 'test'] }, expected: 'a=1&b=1&b=2&b=3&b=test' },
    { input: { a: { b: { c: 1, d: 'test' } } }, expected: 'a.b.c=1&a.b.d=test' },
    {
      input: { a: { b: { c: undefined, d: 'test', e: null, f: '' } } },
      expected: 'a.b.d=test&a.b.f=',
    },
    { input: { a: [1, 2, 3] }, expected: 'a=1&a=2&a=3' },
    { input: { a: date }, expected: 'a=2020-04-16T00%3A00%3A00.000Z' },
    { input: { a: [date] }, expected: 'a=2020-04-16T00%3A00%3A00.000Z' },
    {
      input: { a: [date, date] },
      expected: 'a=2020-04-16T00%3A00%3A00.000Z&a=2020-04-16T00%3A00%3A00.000Z',
    },
  ];

  for (const el of testCases) {
    it(`should handle ${JSON.stringify(el.input)}`, () => {
      const res = paramsSerializer(el.input);

      expect(res).to.be.equal(el.expected);
    });
  }
});
