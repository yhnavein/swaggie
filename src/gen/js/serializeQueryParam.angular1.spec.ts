/** This file tests a code that will be generated and is hardcoded into the templates */

describe('serializeQueryParam.angular1', () => {
  [
    { input: '', property:'page', expected: '' },
    { input: null, property:'page', expected: '' },
    { input: undefined, property:'page', expected: '' },
    { input: 123, property:'page', expected: 'page=123' },
    { input: 'test string', property: 'name', expected: 'name=test%20string' },
    { input: {}, property:'filter', expected: '' },
    { input: { a: 1, b: 'test' }, property:'filter', expected: 'filter.a=1&filter.b=test' },
    { input: { a: 1, b: [1, 2, 3, 'test'] }, property:'filter', expected: 'filter.a=1&filter.b=1%2C2%2C3%2Ctest' },
    { input: [1, 2, 3], property:'property', expected: 'property=1%2C2%2C3' },
    { input: new Date('2020-04-16T00:00:00.000Z'), property:'property', expected: 'property=2020-04-16T00%3A00%3A00.000Z' },
    { input: { name:'John', agentId: 7 }, property:'filter', expected: 'filter.name=John&filter.agentId=7' },
  ].forEach((el) => {
    it(`should handle ${JSON.stringify(el.input)} with property ${el.property}`, () => {
      const res = serializeQueryParam(el.input, el.property);

      expect(res).toBe(el.expected);
    });
  });

  function serializeQueryParam(obj: any, property: string): string {
    if (obj === null || obj === undefined || obj === '') {
      return '';
    } else if (obj instanceof Date) {
      return property + '=' + encodeURIComponent(obj.toJSON());
    } else if (typeof obj !== 'object' || Array.isArray(obj)) {
      return property + '=' + encodeURIComponent(obj);
    } else if (typeof obj === 'object') {
      return Object.keys(obj)
        .filter(key => !!serializeQueryParam(obj[key], property + '.' + key))
        .reduce(
          (a: any, b) =>
            a.push(serializeQueryParam(obj[b], property + '.' + b)) && a,
          []
        )
        .join('&');
    } else {
      return '';
    }
  }
});
