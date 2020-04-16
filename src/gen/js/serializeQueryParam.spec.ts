/** This file tests a code that will be generated and is hardcoded into the templates */

describe('serializeQueryParam', () => {
  [
    { input: '', expected: '' },
    { input: null, expected: '' },
    { input: undefined, expected: '' },
    { input: 123, expected: '123' },
    { input: 'test string', expected: 'test%20string' },
    { input: {}, expected: '' },
    { input: { a: 1, b: 'test' }, expected: 'a=1&b=test' },
    { input: { a: 1, b: [1, 2, 3, 'test'] }, expected: 'a=1&b=1%2C2%2C3%2Ctest' },
    { input: [1, 2, 3], expected: '1%2C2%2C3' },
    { input: new Date('2020-04-16T00:00:00.000Z'), expected: '2020-04-16T00%3A00%3A00.000Z' },
  ].forEach((el) => {
    it(`should handle ${JSON.stringify(el.input)}`, () => {
      const res = serializeQueryParam(el.input);

      expect(res).toBe(el.expected);
    });
  });

  function serializeQueryParam(obj: any) {
    if (obj === null || obj === undefined) return '';
    if (obj instanceof Date) return encodeURIComponent(obj.toJSON());
    if (typeof obj !== 'object' || Array.isArray(obj)) return encodeURIComponent(obj);
    return Object.keys(obj)
      .reduce((a, b) => a.push(encodeURIComponent(b) + '=' + encodeURIComponent(obj[b])) && a, [])
      .join('&');
  }
});

/** This is different, because we don't need to encode parameters for axios as axios is doing it on its own */
describe('serializeQueryParam / axios', () => {
  [
    { input: '', expected: '' },
    { input: null, expected: '' },
    { input: undefined, expected: '' },
    { input: 123, expected: 123 },
    { input: 'test string', expected: 'test string' },
    { input: {}, expected: '' },
    { input: { a: 1, b: 'test' }, expected: 'a=1&b=test' },
    { input: { a: 1, b: [1, 2, 3, 'test'] }, expected: 'a=1&b=1,2,3,test' },
    { input: new Date('2020-04-16T00:00:00.000Z'), expected: '2020-04-16T00:00:00.000Z' },
  ].forEach((el) => {
    it(`should handle ${JSON.stringify(el.input)}`, () => {
      const res = serializeQueryParam(el.input);

      expect(res).toBe(el.expected);
    });
  });

  it(`should handle array`, () => {
    const res = serializeQueryParam([1, 2, 3]);

    expect(res.toString()).toBe([1, 2, 3].toString());
  });

  function serializeQueryParam(obj: any) {
    if (obj === null || obj === undefined) return '';
    if (obj instanceof Date) return obj.toJSON();
    if (typeof obj !== 'object' || Array.isArray(obj)) return obj;
    return Object.keys(obj)
      .reduce((a, b) => a.push(b + '=' + obj[b]) && a, [])
      .join('&');
  }
});
