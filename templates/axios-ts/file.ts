/*
 * @@description:文件处理方法
 * @Author: qifeng qifeng@carbonstop.net
 * @Date: 2022-11-29 16:24:06
 * @LastEditors: qifeng qifeng@carbonstop.net
 * @LastEditTime: 2022-11-29 16:27:52
 */

import * as path from 'path';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as crypto from 'crypto';
import config from './configs';

/** ascii to chinese */
export function reconvert(str: string) {
  let usedStr = str.trim();
  // unicode to chinese
  usedStr = usedStr.replace(/(\\u)(\w{1,4})/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%5Cu)(\w{1,4})/g, '$2'), 16));
  });

  // ascii to chinese
  usedStr = usedStr.replace(/(&#x)(\w{1,4});/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g, '$2'), 16));
  });
  // ascii to chinese
  usedStr = usedStr.replace(/(&#)(\d{1,6});/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%26%23)(\d{1,6})(%3B)/g, '$2')));
  });
  // &apos; => '
  usedStr = usedStr.replaceAll('&apos;', "'");
  return usedStr;
}

/** md5 */
export const md5 = (str: string): string => {
  try {
    return crypto.createHash('md5').update(str).digest('hex');
  } catch {
    return '';
  }
};

/** unicode cjk 中日韩文 范围 */
const DOUBLE_BYTE_REGEX = /[\u4E00-\u9FFF]+/g;

/** 匹配三目运算符 */
const TrinocularOperationRegex = /\{\{.*\?.*\:.*\}\}/g;

/** 匹配小程序变量   「中文{{any}}中文」  */
const VariableRegex = /.*[\u4E00-\u9FFF]+.*\{\{.*\}\}.*[\u4E00-\u9FFF]+.*/g;

/** 匹配小程序变量  */
const VariableReg = /.*\{\{.*\}\}.*/g;

/** 检测是否含有中文 */
export const getZhText = (text: string) => {
  const matchArr = text.match(DOUBLE_BYTE_REGEX) || [];
  let trimedText = text.replaceAll(/\s+/g, '');
  // 是否有正则
  let isHasTrinocularOperation = false;
  // 是否使用变量
  let isHasVariable = false;
  // 是否是只一侧有中文
  let isJust1PartHasVariable = false;
  if (trimedText && matchArr.length) {
    const matchedTrinocular = trimedText.match(TrinocularOperationRegex);
    if (matchedTrinocular?.length) {
      isHasTrinocularOperation = true;
      // 2侧有文字模式
    } else if (trimedText.match(VariableRegex)?.length) {
      isHasVariable = true;
    } else if (trimedText.match(VariableReg)?.length) {
      isJust1PartHasVariable = true;
      // console.log(trimedText, 'trimedText', matchArr);
    }
  }

  return {
    matchArr,
    trimedText,
    isHasTrinocularOperation,
    isHasVariable,
    isJust1PartHasVariable,
  };
};

/** 中文拼音 - 驼峰 */
export const changePinyin2Camelcase = (name: string) => {
  return _.camelCase(name);
};

/** 获取文件相对路径 - 作为翻译页面的 key */
export const getFilePath = (pathStr: string): string => {
  const path = pathStr.trim();
  // 绝对路径
  if (path.includes('miniprogram/')) {
    return _.camelCase(
      path
        .split('miniprogram/')[1]
        // remove .wxml
        .slice(0, -5)

        .replaceAll('/', '-')
    );
  } else if ((path.startsWith('./') || path.startsWith('/')) && path.endsWith(config.matchFile)) {
    return _.camelCase(
      path.slice(path.startsWith('/') ? 1 : 2, -config.matchFile.length).replaceAll('/', '-')
    );
  } else if (path.endsWith(config.matchFile)) {
    return _.camelCase(path.slice(0, -config.matchFile.length).replaceAll('/', '-'));
  }
  return _.camelCase(path.replaceAll('/', '-'));
};

/**
 * 获取文件夹下符合要求的所有文件
 * @function getSpecifiedFiles
 * @param  {string} dir 路径
 * @param {ignoreDirectory} 忽略文件夹 {ignoreFile} 忽略的文件
 */
function getSpecifiedFiles(dir, ignoreDirectory = '', ignoreFile = '') {
  return fs.readdirSync(dir).reduce((files, file) => {
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    const isFile = fs.statSync(name).isFile();

    if (isDirectory) {
      return files.concat(getSpecifiedFiles(name, ignoreDirectory, ignoreFile));
    }

    const isIgnoreDirectory =
      !ignoreDirectory ||
      (ignoreDirectory && !path.dirname(name).split('/').includes(ignoreDirectory));
    const isIgnoreFile = !ignoreFile || (ignoreFile && path.basename(name) !== ignoreFile);

    if (isFile && isIgnoreDirectory && isIgnoreFile) {
      return files.concat(name);
    }
    return files;
  }, []);
}

/**
 * 读取文件
 * @param fileName
 */
function readFile(fileName) {
  if (fs.existsSync(fileName)) {
    return fs.readFileSync(fileName, 'utf-8');
  }
}

/**
 * 读取文件
 * @param fileName
 */
function writeFile(filePath, file) {
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file);
  }
}

/**
 * 判断是文件
 * @param path
 */
function isFile(path) {
  return fs.statSync(path).isFile();
}

/**
 * 判断是文件夹
 * @param path
 */
function isDirectory(path) {
  return fs.statSync(path).isDirectory();
}

export { getSpecifiedFiles, readFile, writeFile, isFile, isDirectory };
