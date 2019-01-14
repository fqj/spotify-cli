'use strict';


const fs = require('fs-extra');
const glob = require('glob');
const path_join = require('path').join;
const path_resolve = require('path').resolve;
const path_basename = require('path').basename;

const { logger } = require('../utils/logger');
const { parseJson } = require('../utils/utils');
const constants = require('../constants');

const prepareLocalesParameters = parameters => {

    const { source } = parameters;

    const _source = parameters.locales.source;
    const _destination = parameters.locales.destination + '/locales';
    const _appLocales = constants.ROOT_LOCALES;

    const mkdirSync = function (dirPath) {
      try {
        fs.mkdirSync(dirPath)
      } catch (err) {
        if (err.code !== 'EEXIST') throw err
      }
    }

    const checkSourceFolders = _source => _source.map(f => fs.existsSync(f));
    if (checkSourceFolders(_source)) {
        const __source = _source.length > 1 ? `{${_source.join(',')}}` : _source[0];
        const localesFoldersGlobPattern = `${__source}/${constants.LOCALES_GLOB_PATTERN}`;
        mkdirSync(path_resolve(_destination))
        let localesParameters = {
            folderPattern: localesFoldersGlobPattern,
            destinationFolder: _destination,
        };

        if (fs.existsSync(_appLocales)) {
            localesParameters = Object.assign(localesParameters, 
                {
                    rootLocalesFolder: _appLocales,
                    rootLocalesPattern: constants.ROOT_LOCALES_GLOBAL_PATTERN
                }
            );
        }

        logger().info(
        `Locales will be generated searching recursively in the following folders:
        ${_source.join(', ')} ${fs.existsSync(_appLocales) ? `and ${_appLocales} as root locales` : ''}`);
        parameters.locales = Object.assign({}, localesParameters);
        return parameters;

    } else {
        throw new Error(`Some of the ${source} folders do not exist`);
    }
};

const LANG_SEPARATOR = '-';
const isVariantLang = lang => lang.indexOf(LANG_SEPARATOR) !== -1
const isBaseLang = lang => !isVariantLang(lang)
const getBaseLang = lang => lang.split(LANG_SEPARATOR).shift()
const getFileNameFromPath = pathToFile => removeExtension(path_basename(pathToFile));
const removeExtension = file => file.split('.').shift()

const getFilesFromGlobPattern = pattern => new Promise((resolve, reject) => glob(pattern, (error, files) => error? reject(error) : resolve(files)));

const getLangFiles = parameters => {
  let promises = [ getChildrenLangFiles ];

  if (parameters.rootLocalesFolder && fs.existsSync(parameters.rootLocalesFolder)) {
    promises.push(getRootLangFiles);
  }

  return promises.reduce(
    (previous, current) => previous.then(current),
    Promise.resolve(parameters)
  );
};

const filterLocalesFiles = pattern => files => pattern? files.filter(file => !file.match(pattern)) : files;

const getChildrenLangFiles = parameters =>
  getFilesFromGlobPattern(parameters.folderPattern)
    .then(filterLocalesFiles(parameters.exclude))
    .then(files => Object.assign(parameters, { files }));

const getRootLangFiles = parameters =>
  getFilesFromGlobPattern(parameters.rootLocalesPattern)
    .then(rootLocalesFiles => Object.assign(parameters, { rootLocalesFiles }));

const getLangs = parameters => {
  const files = parameters.files;
  const rootLocalesFiles = parameters.rootLocalesFiles || [];
  const allLocalesFiles = rootLocalesFiles.concat(files);
  const locales = allLocalesFiles.map(getFileNameFromPath);

  parameters.langs = [... new Set(locales)];

  return parameters;
};

const createLocalesFolder = parameters => {
  return new Promise((resolve, reject) => {
    try {
      const { destinationFolder } = parameters;

    //  fs.removeSync(destinationFolder);
      fs.ensureDirSync(destinationFolder);

      resolve(parameters);
    } catch (e) {
      reject(e);
    }
  });
};

const prepareStep = parameters => getLangFiles(parameters).then(getLangs).then(createLocalesFolder);
                      
const writeLangObject = (langObject, lang, destinationFolder) => {
  return new Promise((resolve, reject) => {
    try {
      const langFilePath = path_join(destinationFolder, `${lang}.json`);
      fs.ensureFileSync(langFilePath);
      fs.writeJsonSync(langFilePath, langObject);
    logger().info(`Writing locale files`)
      resolve(langFilePath);
    } catch (e) {
      reject(e);
    }
  });
};

const groupFilesByLang = (files, langs) => {
  let groupedFiles = {};

  langs.forEach(lang => {
    groupedFiles[lang] = [];
    files
      .filter(file => getFileNameFromPath(file) === lang)
      .forEach(file => groupedFiles[lang].push(file));
  });

  return groupedFiles;
};

const createLangObjects = (groupedLangFiles, rootLocalesFolder = '') => {
  //First base langs ('es', 'en', and so on, and then 'es-MX', 'es-US', and so on)
  const langs = Object.keys(groupedLangFiles);
  let langObjects = {};

  langs
    .sort(isVariantLang)
    .forEach(lang => {
      langObjects[lang] = {};
      let rootLocalesObj;

      groupedLangFiles[lang].forEach(file => {
        langObjects[lang] = Object.assign(langObjects[lang], parseJson(file));

        if (file.match(rootLocalesFolder)) {
          rootLocalesObj = parseJson(file);
        }
      });

      if(isVariantLang(lang)) {
        const baseLang = lang.split(LANG_SEPARATOR).shift();

        langObjects[lang] = Object.assign({}, langObjects[baseLang], langObjects[lang]);
      }

      if (rootLocalesObj) {
        langObjects[lang] = Object.assign({}, langObjects[lang], rootLocalesObj);
      }
    });

    return langObjects;
};

const writeLocales = parameters => {
  
  return new Promise((resolve, reject) => {
    try {
      const { destinationFolder, files, langs, rootLocalesFolder } = parameters;
      let promises = [];
      let rootLocalesFiles = [];

      // rootLocalesFolder is optional (and, consequently, rootLocalesFiles is also)
      if (rootLocalesFolder) {
        rootLocalesFiles = fs.readdirSync(rootLocalesFolder).map(file => path_join(rootLocalesFolder, file));
      }

      const filesGroupedByLang = groupFilesByLang(files.concat(rootLocalesFiles), langs);
      const langObjects = createLangObjects(filesGroupedByLang, rootLocalesFolder);

      Object.keys(langObjects).forEach((lang) => {
        promises.push(writeLangObject(langObjects[lang], lang, destinationFolder));
      });

      Promise.all(promises)
        .then(values => 
          resolve(
            Object.assign(parameters, { localesFiles: values })
          )
        );
    } catch (e) {
      reject(e);
    }
  });
};

const locales = parameters => {
    prepareLocalesParameters(parameters);
    return Promise.resolve(parameters.locales)
                  .then(prepareStep)
                  .then(writeLocales)
                  .then(_ => parameters);
}

module.exports = locales;
