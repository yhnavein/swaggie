import { getUnionType } from './models';

describe('getUnionType', () => {
  describe('without discriminators', () => {
    it('handles empty array', () => {
      const res = getUnionType([]);

      expect(res).toBeDefined();
    });

    it('handles single ref element', () => {
      const res = getUnionType([
        {
          $ref: '#/components/schemas/ApplicationViewModel',
        },
      ]);

      expect(res).toBeDefined();
    });
  });
});
