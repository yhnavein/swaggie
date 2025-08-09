import { test, describe } from 'node:test';
import assert from 'node:assert';

/** This file tests a code that will be generated and is hardcoded into the templates */

/**
 * Serializes a params object into a query string that is compatible with different REST APIs.
 * Implementation from: https://github.com/suhaotian/xior/blob/main/src/utils.ts
 * Kudos to @suhaotian for the original implementation
 */
function encodeParams<T = any>(
  params: T,
  parentKey: string | null = null,
  options?: {
    allowDots?: boolean;
    serializeDate?: (value: Date) => string;
    arrayFormat?: 'indices' | 'repeat' | 'brackets';
  }
): string {
  if (params === undefined || params === null) return '';
  const encodedParams: string[] = [];
  const paramsIsArray = Array.isArray(params);
  const { arrayFormat, allowDots, serializeDate } = options || {};

  const getKey = (key: string) => {
    if (allowDots && !paramsIsArray) return `.${key}`;
    if (paramsIsArray) {
      if (arrayFormat === 'brackets') {
        return '[]';
      }
      if (arrayFormat === 'repeat') {
        return '';
      }
    }
    return `[${key}]`;
  };

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      let value = (params as any)[key];
      if (value !== undefined) {
        const encodedKey = parentKey ? `${parentKey}${getKey(key)}` : (key as string);

        // biome-ignore lint/suspicious/noGlobalIsNan: <explanation>
        if (!isNaN(value) && value instanceof Date) {
          value = serializeDate ? serializeDate(value) : value.toISOString();
        }
        if (typeof value === 'object') {
          // If the value is an object or array, recursively encode its contents
          const result = encodeParams(value, encodedKey, options);
          if (result !== '') encodedParams.push(result);
        } else {
          // Otherwise, encode the key-value pair
          encodedParams.push(`${encodeURIComponent(encodedKey)}=${encodeURIComponent(value)}`);
        }
      }
    }
  }

  return encodedParams.join('&');
}

const date = new Date('2020-04-16T00:00:00.000Z');

describe('encodeParams', () => {
  type Opts = {
    allowDots?: boolean;
    serializeDate?: (value: Date) => string;
    arrayFormat?: 'indices' | 'repeat' | 'brackets';
  };

  type Case = { input: any; exp: string };
  type TestCase = { opts: Opts; cases: Case[] };

  const testCases: TestCase[] = [
    {
      opts: {},
      cases: [
        { input: '', exp: '' },
        { input: null, exp: '' },
        { input: undefined, exp: '' },
        { input: {}, exp: '' },
      ],
    },
    {
      opts: { allowDots: true, arrayFormat: 'repeat' },
      cases: [
        { input: { a: 1, b: 'test' }, exp: 'a=1&b=test' },
        { input: { a: 1, b: [1, 2, 3, 'test'] }, exp: 'a=1&b=1&b=2&b=3&b=test' },
        { input: { a: { b: { c: 1, d: 'test' } } }, exp: 'a.b.c=1&a.b.d=test' },
        {
          input: { a: { b: { c: undefined, d: 'test', e: null, f: '' } } },
          exp: 'a.b.d=test&a.b.f=',
        },
        { input: { a: [1, 2, 3] }, exp: 'a=1&a=2&a=3' },
        { input: { a: date }, exp: encodeUri('a=2020-04-16T00:00:00.000Z') },
        { input: { a: [date] }, exp: encodeUri('a=2020-04-16T00:00:00.000Z') },
        {
          input: { a: [date, date] },
          exp: encodeUri('a=2020-04-16T00:00:00.000Z&a=2020-04-16T00:00:00.000Z'),
        },
      ],
    },
    {
      opts: { allowDots: true, arrayFormat: 'brackets' },
      cases: [
        { input: { a: 1, b: 'test' }, exp: 'a=1&b=test' },
        {
          input: { a: 1, b: [1, 2, 3, 'test'] },
          exp: encodeUri('a=1&b[]=1&b[]=2&b[]=3&b[]=test'),
        },
        { input: { a: { b: { c: 1, d: 'test' } } }, exp: encodeUri('a.b.c=1&a.b.d=test') },
        {
          input: { a: { b: { c: undefined, d: 'test', e: null, f: '' } } },
          exp: encodeUri('a.b.d=test&a.b.f='),
        },
        { input: { a: [1, 2, 3] }, exp: encodeUri('a[]=1&a[]=2&a[]=3') },
        { input: { a: date }, exp: encodeUri('a=2020-04-16T00:00:00.000Z') },
        { input: { a: [date] }, exp: encodeUri('a[]=2020-04-16T00:00:00.000Z') },
        {
          input: { a: [date, date] },
          exp: encodeUri('a[]=2020-04-16T00:00:00.000Z&a[]=2020-04-16T00:00:00.000Z'),
        },
      ],
    },
    {
      opts: { allowDots: true, arrayFormat: 'indices' },
      cases: [
        { input: { a: 1, b: 'test' }, exp: 'a=1&b=test' },
        {
          input: { a: 1, b: [1, 2, 3, 'test'] },
          exp: encodeUri('a=1&b[0]=1&b[1]=2&b[2]=3&b[3]=test'),
        },
        { input: { a: { b: { c: 1, d: 'test' } } }, exp: encodeUri('a.b.c=1&a.b.d=test') },
        {
          input: { a: { b: { c: undefined, d: 'test', e: null, f: '' } } },
          exp: encodeUri('a.b.d=test&a.b.f='),
        },
        { input: { a: [1, 2, 3] }, exp: encodeUri('a[0]=1&a[1]=2&a[2]=3') },
        { input: { a: date }, exp: encodeUri('a=2020-04-16T00:00:00.000Z') },
        { input: { a: [date] }, exp: encodeUri('a[0]=2020-04-16T00:00:00.000Z') },
        {
          input: { a: [date, date] },
          exp: encodeUri('a[0]=2020-04-16T00:00:00.000Z&a[1]=2020-04-16T00:00:00.000Z'),
        },
      ],
    },
    {
      opts: { allowDots: false, arrayFormat: 'repeat' },
      cases: [
        { input: { a: 1, b: 'test' }, exp: 'a=1&b=test' },
        { input: { a: 1, b: [1, 2, 3, 'test'] }, exp: 'a=1&b=1&b=2&b=3&b=test' },
        { input: { a: { b: { c: 1, d: 'test' } } }, exp: encodeUri('a[b][c]=1&a[b][d]=test') },
        {
          input: { a: { b: { c: undefined, d: 'test', e: null, f: '' } } },
          exp: encodeUri('a[b][d]=test&a[b][f]='),
        },
        { input: { a: [1, 2, 3] }, exp: 'a=1&a=2&a=3' },
        { input: { a: date }, exp: encodeUri('a=2020-04-16T00:00:00.000Z') },
        { input: { a: [date] }, exp: encodeUri('a=2020-04-16T00:00:00.000Z') },
        {
          input: { a: [date, date] },
          exp: encodeUri('a=2020-04-16T00:00:00.000Z&a=2020-04-16T00:00:00.000Z'),
        },
      ],
    },
    {
      opts: { allowDots: false, arrayFormat: 'indices' },
      cases: [
        { input: { a: 1, b: 'test' }, exp: 'a=1&b=test' },
        {
          input: { a: 1, b: [1, 2, 3, 'test'] },
          exp: encodeUri('a=1&b[0]=1&b[1]=2&b[2]=3&b[3]=test'),
        },
        { input: { a: { b: { c: 1, d: 'test' } } }, exp: encodeUri('a[b][c]=1&a[b][d]=test') },
        {
          input: { a: { b: { c: undefined, d: 'test', e: null, f: '' } } },
          exp: encodeUri('a[b][d]=test&a[b][f]='),
        },
        { input: { a: [1, 2, 3] }, exp: encodeUri('a[0]=1&a[1]=2&a[2]=3') },
        { input: { a: date }, exp: encodeUri('a=2020-04-16T00:00:00.000Z') },
        { input: { a: [date] }, exp: encodeUri('a[0]=2020-04-16T00:00:00.000Z') },
        {
          input: { a: [date, date] },
          exp: encodeUri('a[0]=2020-04-16T00:00:00.000Z&a[1]=2020-04-16T00:00:00.000Z'),
        },
      ],
    },
  ];

  for (const el of testCases) {
    describe(`with options: ${JSON.stringify(el.opts)}`, () => {
      for (const { input, exp } of el.cases) {
        test(`should handle ${JSON.stringify(input)}`, () => {
          const res = encodeParams(input, null, el.opts);

          assert.strictEqual(res, exp);
        });
      }
    });
  }
});

function encodeUri(query: string): string {
  return encodeURI(query).replaceAll(':', '%3A');
}
