/*
 * @@description: 配置目录
 * @Author: qifeng qifeng@carbonstop.net
 * @Date: 2022-11-29 15:33:24
 * @LastEditors: qifeng qifeng@carbonstop.net
 * @LastEditTime: 2022-11-29 18:57:31
 */
const path = require('path');

const basePath = path.join(__dirname, '../../client');

export default {
  /** api 生成的文件夹根目录 */
  basePath,
  /** 模版文件目录 */
  templatePath: path.join(__dirname, '../axios-ts/'),
  /** swagger json 文件的位置 */
  swaggerJsonUrls: [
    'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v2.0/json/petstore.json',
  ],
  /** 需要替换的接口文件地址，eg.  baseURL: `${process.env.REACT_APP_API_URL}`,  */
  baseUrlReplaceString: 'baseURL: `${process.env.REACT_APP_API_URL}`,',
  /** 不要动 */
  matchFile: '.ts',
};
