import { escapeReservedWords, prepareOutputFilename } from './utils';

describe('prepareOutputFilename', () => {
  [
    { given: null, expected: null },
    { given: 'api.ts', expected: 'api.ts' },
    { given: 'api', expected: 'api.ts' },
    { given: 'api/', expected: 'api/index.ts' },
    { given: 'api\\', expected: 'api/index.ts' },
    { given: 'api/api.ts', expected: 'api/api.ts' },
    { given: 'api//api.ts', expected: 'api//api.ts' },
    { given: 'api\\api.ts', expected: 'api/api.ts' },
    { given: 'api/api/', expected: 'api/api/index.ts' },
  ].forEach((el) => {
    it(`handles ${el.given}`, () => {
      const res = prepareOutputFilename(el.given);

      expect(res).toBe(el.expected);
    });
  });
});

describe('escapeReservedWords', () => {
  it('handles null', () => {
    const res = escapeReservedWords(null);

    expect(res).toBe(null);
  });

  it('handles empty string', () => {
    const res = escapeReservedWords('');

    expect(res).toBe('');
  });

  it('handles safe word', () => {
    const res = escapeReservedWords('Burrito');

    expect(res).toBe('Burrito');
  });

  it('handles reserved word', () => {
    const res = escapeReservedWords('return');

    expect(res).toBe('_return');
  });
});
