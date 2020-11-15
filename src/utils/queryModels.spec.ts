import { getQueryModels } from './queryModels';

const defaultSpec = {
  openapi: '3.0.0',
  info: {
    title: 'My Title',
    version: '1.0.0',
  },
};

describe('getQueryModels', () => {
  describe('handle empty cases', () => {
    it('should handle empty paths spec', async () => {
      const models = getQueryModels({ ...defaultSpec, paths: {} });
      expect(models).toStrictEqual([]);
    });

    it('should handle operation without params', async () => {
      const models = getQueryModels({
        ...defaultSpec,
        paths: {
          '/api/something': {
            get: {
              parameters: [],
            },
          },
        },
      });
      expect(models).toStrictEqual([]);
    });

    it('should handle operation without query params', async () => {
      const models = getQueryModels({
        ...defaultSpec,
        paths: {
          '/api/something': {
            get: {
              parameters: [
                {
                  name: 'SortField',
                  in: 'path',
                  schema: {
                    type: 'string',
                    nullable: true,
                  },
                },
                {
                  name: 'Page',
                  in: 'path',
                  schema: {
                    type: 'integer',
                    format: 'int32',
                    nullable: true,
                  },
                },
              ],
            },
          },
        },
      });
      expect(models).toStrictEqual([]);
    });

    it('should ignore singular query params', async () => {
      const models = getQueryModels({
        ...defaultSpec,
        paths: {
          '/api/something': {
            get: {
              parameters: [
                {
                  name: 'SortField',
                  in: 'query',
                  schema: {
                    type: 'string',
                    nullable: true,
                  },
                },
                {
                  name: 'Page',
                  in: 'path',
                  schema: {
                    type: 'integer',
                    format: 'int32',
                    nullable: true,
                  },
                },
              ],
            },
          },
        },
      });
      expect(models).toStrictEqual([]);
    });
  });

  describe('normal cases', () => {
    it('should create proper query type', async () => {
      const models = getQueryModels({
        ...defaultSpec,
        paths: {
          '/api/something': {
            get: {
              operationId: 'GetSomething',
              parameters: [
                {
                  name: 'SortField',
                  in: 'query',
                  schema: {
                    type: 'string',
                    nullable: true,
                  },
                },
                {
                  name: 'Page',
                  in: 'query',
                  schema: {
                    type: 'integer',
                    format: 'int32',
                    nullable: true,
                  },
                },
              ],
            },
          },
        },
      });
      expect(models).toBeDefined();
      expect(models.length).toBe(1);
      expect(models[0].name).toBe('IGetSomethingServiceQuery');
      expect(models[0].properties).toBeDefined();
      expect(models[0].properties.SortField).toBeDefined();
      expect(models[0].properties.Page).toBeDefined();
    });
  });
});
