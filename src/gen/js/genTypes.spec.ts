import { expect } from 'chai';
import type { ApiSpec } from '../../types';
import genTypes, { renderQueryStringParameters, renderComment } from './genTypes';

const emptySpec: ApiSpec = {
  swagger: '2.0',
  info: {
    title: 'Some Api',
    version: 'v1',
  },
  paths: [],
  definitions: [],
  accepts: [],
  contentTypes: [],
};

describe('genTypes', () => {
  it('should handle empty definitions properly', () => {
    const res = genTypes(emptySpec, {}, {} as any);

    expect(res).to.be.equal('');
  });

  describe('enums', () => {
    describe('int-serialized simple enums', () => {
      it(`should handle Swashbuckle's enum correctly`, () => {
        const res = genTypes(
          emptySpec,
          {
            SomeEnum: {
              format: 'int32',
              enum: [0, 1],
              type: 'integer',
            },
          },
          {} as any
        );

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal('export type SomeEnum = 0 | 1;');
      });

      it(`should handle NSwag's enum correctly`, () => {
        const res = genTypes(
          emptySpec,
          {
            SomeEnum: {
              type: 'integer',
              format: 'int32',
              enum: ['Active', 'Disabled'],
              fullEnum: {
                Active: 0,
                Disabled: 1,
              },
            },
          },
          {} as any
        );

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal(`export enum SomeEnum {
  Active = 0,
  Disabled = 1,
}`);
      });
    });

    describe('string-serialized simple enums', () => {
      it(`should handle Swashbuckle's enum correctly`, () => {
        const res = genTypes(
          emptySpec,
          {
            SomeEnum: {
              enum: ['Active', 'Disabled'],
              type: 'string',
            },
          },
          {} as any
        );

        expect(res).to.be.ok;
        expect(res.trim()).to.be.equal(`export type SomeEnum = 'Active' | 'Disabled';`);
      });
    });
  });

  describe('x-enums', () => {
    it('should handle number-based x-enums correctly', () => {
      const res = genTypes(
        emptySpec,
        {
          GrantType: {
            type: 'integer',
            description: '',
            'x-enumNames': ['None', 'Password', 'External', 'Internal'],
            enum: [0, 1, 2, 3],
          },
        },
        {} as any
      );

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(`export enum GrantType {
  None = 0,
  Password = 1,
  External = 2,
  Internal = 3,
}`);
    });

    it('should handle string-based x-enums correctly', () => {
      const res = genTypes(
        emptySpec,
        {
          GrantType: {
            type: 'string',
            description: '',
            'x-enumNames': ['None', 'Password', 'External', 'Internal'],
            enum: ['None', 'Password', 'External', 'Internal'],
          },
        },
        {} as any
      );

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(`export enum GrantType {
  None = "None",
  Password = "Password",
  External = "External",
  Internal = "Internal",
}`);
    });
  });

  describe('normal objects', () => {
    it('should handle obj with no required fields', () => {
      const res = genTypes(
        emptySpec,
        {
          AuthenticationData: {
            type: 'object',
            properties: {
              login: {
                type: 'string',
              },
              password: {
                type: 'string',
              },
            } as any,
          },
        },
        {} as any
      );

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(`export interface AuthenticationData {
  login?: string;
  password?: string;
}`);
    });

    it('should handle obj with all required fields', () => {
      const res = genTypes(
        emptySpec,
        {
          AuthenticationData: {
            type: 'object',
            properties: {
              login: {
                type: 'string',
              },
              password: {
                type: 'string',
              },
            } as any,
            required: ['login', 'password'],
          },
        },
        {} as any
      );

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(`export interface AuthenticationData {
  login: string;
  password: string;
}`);
    });
  });

  describe('objects with read-only fields', () => {
    it('should ignore read-only fields', () => {
      const res = genTypes(
        emptySpec,
        {
          PagedAndSortedQuery: {
            properties: {
              isPagingSpecified: {
                readOnly: true,
                type: 'boolean',
              },
              sortField: {
                type: 'string',
              },
            } as any,
            required: [],
            type: 'object',
          },
        },
        {} as any
      );

      expect(res).to.be.ok;
      expect(res.trim()).to.be.equal(`export interface PagedAndSortedQuery {
  sortField?: string;
}`);
    });
  });
});

describe('renderQueryStringParameters', () => {
  it('should handle empty list correctly', () => {
    const def = {
      type: 'object',
      required: [],
      queryParam: true,
      properties: {},
    };
    const res = renderQueryStringParameters(def, {} as any);

    expect(res).to.deep.equal([]);
  });

  it('should handle one element without dots', () => {
    const def = {
      type: 'object',
      required: [],
      queryParam: true,
      properties: {
        page: {
          name: 'page',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
      },
    };
    const res = renderQueryStringParameters(def, {} as any);

    expect(res).to.be.ok;
    expect(res.length).to.eq(1);
    expect(res[0]).to.contain('page?: number;');
  });

  it('should handle one element in a dot notation', () => {
    const def = {
      type: 'object',
      required: [],
      queryParam: true,
      properties: {
        parameters_page: {
          name: 'parameters.page',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
      },
    };
    const res = renderQueryStringParameters(def, {} as any);

    expect(res).to.be.ok;
    expect(res.length).to.eq(1);
    expect(textOnly(res[0])).to.be.equal(textOnly('parameters?: {page?: number; }'));
  });

  it('should handle two elements in a dot notation', () => {
    const def = {
      type: 'object',
      required: [],
      queryParam: true,
      properties: {
        parameters_page: {
          name: 'parameters.page',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
        parameters_count: {
          name: 'parameters.count',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
      },
    };
    const res = renderQueryStringParameters(def, {} as any);

    expect(res).to.be.ok;
    expect(textOnly(res[0])).to.be.equal(
      textOnly('parameters?: {page?: number; count?: number; }')
    );
  });

  it('should handle four elements in a dot notation', () => {
    const def = {
      type: 'object',
      required: [],
      queryParam: true,
      properties: {
        parameters_page: {
          name: 'parameters.page',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
        parameters_count: {
          name: 'parameters.count',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
        else_page: {
          name: 'else.page',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
        else_count: {
          name: 'else.count',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
      },
    };
    const res = renderQueryStringParameters(def, {} as any);

    expect(res).to.be.ok;
    expect(res.length).to.eq(2);
    expect(textOnly(res[0])).to.be.equal(
      textOnly('parameters?: {page?: number; count?: number; }')
    );
    expect(textOnly(res[1])).to.be.equal(textOnly('else?: {page?: number; count?: number; }'));
  });

  it('crazy case #1', () => {
    const def = {
      type: 'object',
      required: [],
      queryParam: true,
      properties: {
        parameters_filter_countryName: {
          name: 'parameters.filter.countryName',
          in: 'query',
          required: false,
          type: 'string',
        },
        parameters_filter_active: {
          name: 'parameters.filter.active',
          in: 'query',
          required: false,
          type: 'boolean',
        },
        parameters_sortField: {
          name: 'parameters.sortField',
          in: 'query',
          required: false,
          type: 'string',
        },
        parameters_sortDir: {
          name: 'parameters.sortDir',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
          enum: ['Undefined', 'Asc', 'Desc'],
          fullEnum: {
            Undefined: 0,
            Asc: 1,
            Desc: 2,
          },
        },
        parameters_page: {
          name: 'parameters.page',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
        parameters_count: {
          name: 'parameters.count',
          in: 'query',
          required: false,
          type: 'integer',
          format: 'int32',
        },
        test: {
          name: 'test',
          in: 'query',
          required: true,
          type: 'integer',
          format: 'int32',
        },
      },
    };
    const res = renderQueryStringParameters(def, {} as any);

    expect(res).to.be.ok;
    expect(res.length).to.eq(2);
    expect(textOnly(res[0])).to.be.equal(
      textOnly(`parameters?: {
filter?: {
  countryName?: string;
  active?: boolean;
}
  sortField?: string;
  sortDir?: number;
  page?: number;
  count?: number;
}`)
    );
    expect(textOnly(res[1])).to.be.equal(textOnly('test: number;'));
  });
});

describe('renderComment', () => {
  it('should render proper multiline comment', () => {
    const comment = `Quite a lenghty comment
With at least two lines`;
    const res = renderComment(comment);

    expect(res).to.be.equal(` /**
  * Quite a lenghty comment
  * With at least two lines
  */`);
  });

  it('should render proper multiline comment with trimming', () => {
    const comment = `   Quite a lenghty comment
   With at least two lines    `;
    const res = renderComment(comment);

    expect(res).to.be.equal(` /**
  * Quite a lenghty comment
  * With at least two lines
  */`);
  });

  it('should render proper one-line comment', () => {
    const comment = 'One liner';
    const res = renderComment(comment);

    expect(res).to.be.equal('// One liner');
  });

  it('should render proper one-line comment with trimming', () => {
    const comment = '   One liner   ';
    const res = renderComment(comment);

    expect(res).to.be.equal('// One liner');
  });

  it('should handle null comment', () => {
    const comment = null;
    const res = renderComment(comment);

    expect(res).to.be.null;
  });

  it('should handle empty comment', () => {
    const comment = '';
    const res = renderComment(comment);

    expect(res).to.be.null;
  });
});

function textOnly(content: string) {
  if (!content) {
    return null;
  }
  return content.replace(/\s+/g, '');
}
