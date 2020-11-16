import { SyntaxKind, NodeArray } from 'typescript';
import { getUnionType, genType } from './models';

describe('genType', () => {
  describe('simple properties', () => {
    it('should handle empty properties', () => {
      const res = genType('name', {
        type: 'object',
        additionalProperties: false,
      });

      expect(res).toBeDefined();
      expect(res.kind).toBe(SyntaxKind.InterfaceDeclaration);
      expect(res.name.escapedText).toBe('name');
      expect(res.members.length).toBe(0);
    });
    it('should handle empty abstract type', () => {
      const res = genType('name', {
        type: 'object',
        'x-abstract': true,
        additionalProperties: false,
      });

      expect(res).toBeDefined();
      expect(res.kind).toBe(SyntaxKind.InterfaceDeclaration);
      expect(res.members.length).toBe(0);
    });

    it('should handle standard type', () => {
      const res = genType('name', {
        type: 'object',
        additionalProperties: false,
        properties: {
          Id: {
            type: 'integer',
            format: 'int32',
          },
          Name: {
            type: 'string',
            nullable: true,
          },
        },
      });

      expect(res).toBeDefined();
      expect(res.kind).toBe(SyntaxKind.InterfaceDeclaration);
      expect(res.members.length).toBe(2);
      const members = res.members as NodeArray<any>;
      expect(members[0].name.escapedText).toBe('Id');
      expect(members[0].type.kind).toBe(SyntaxKind.NumberKeyword);
      expect(members[1].name.escapedText).toBe('Name');
      expect(members[1].type.kind).toBe(SyntaxKind.UnionType);
      expect(members[1].type.types.map((t) => t.kind)).toContain(SyntaxKind.StringKeyword);
    });
  });

  // describe('enums', () => {
  //   it('should handle x-enums', () => {
  //     const res = genType('name', {
  //       type: 'integer',
  //       description: '',
  //       'x-enumNames': ['Active', 'Inactive', 'Expired'],
  //       enum: [1, 2, 3],
  //     });

  //     expect(res).toBeDefined();
  //     expect(res.kind).toBe(SyntaxKind.EnumDeclaration);
  //     expect(res.members.length).toBe(2);
  //     const members = res.members as NodeArray<any>;
  //   });
  // });
});

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
