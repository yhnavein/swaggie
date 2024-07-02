import chaiType from 'chai';

chaiType.use((chai, utils) => {
  chai.Assertion.addMethod('equalWI', function (expected: string) {
    const actual = this._obj;

    const normalizedActual = normalizeWhitespace(actual);
    const normalizedExpected = normalizeWhitespace(expected);

    this.assert(
      normalizedActual === normalizedExpected,
      'expected #{this} to equal #{exp} ignoring whitespace',
      'expected #{this} to not equal #{exp} ignoring whitespace',
      expected,
      actual,
      true
    );
  });
});

/**
 * It will get rid of all whitespaces and trim the string, so that we can
 * compare strings without worrying about whitespaces.
 */
const normalizeWhitespace = (str: string) => str.replace(/\s+/g, '').trim();
