import { expect } from 'chai';
import { type VerifableDocument, escapeReservedWords, verifyDocumentSpec } from './utils';

describe('escapeReservedWords', () => {
  it('handles null', () => {
    const res = escapeReservedWords(null);

    expect(res).to.be.eql(null);
  });

  it('handles empty string', () => {
    const res = escapeReservedWords('');

    expect(res).to.be.eql('');
  });

  it('handles safe word', () => {
    const res = escapeReservedWords('Burrito');

    expect(res).to.be.eql('Burrito');
  });

  it('handles reserved word', () => {
    const res = escapeReservedWords('return');

    expect(res).to.be.eql('_return');
  });
});

describe('verifyDocumentSpec', () => {
  it('should accept OpenAPI 3', () => {
    expect(() => {
      const res = verifyDocumentSpec({
        openapi: '3.0.3',
        info: {
          title: 'test',
          version: '1.0',
        },
        paths: {},
      });

      expect(res).to.be.ok;
    }).to.not.throw();
  });

  it('should reject Swagger document', () => {
    expect(() => {
      const res = verifyDocumentSpec({
        swagger: '2.0',
      } as VerifableDocument);

      expect(res).to.not.be.ok;
    }).to.throw('not supported');
  });

  it('should reject empty document', () => {
    expect(() => {
      const res = verifyDocumentSpec(null as any);

      expect(res).to.not.be.ok;
    }).to.throw('is empty');
  });
});
