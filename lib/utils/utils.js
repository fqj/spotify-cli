'use strict';
const SpotifyWebApi = require('spotify-web-api-node');
const { clientId, redirectUri, clientSecret, state } = require('../../config/accesGrant.json');
const {red, cyan, grey} = require('chalk');
const fetch = require('fetch-node');
const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');
const moment = require('moment');
const npm = require('npm');
const { logger } = require('./logger');

const composerConfig = require('../../config/composer-config');

const composerDevPorts = require('../../config/composer-ports');

const VERSION_FILES = ['bower.json', 'package.json'];

const parseJson = (jsonPath) => {

  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8') || '{}');
  } catch (e) {
    throw new Error(`The file ${jsonPath} is not a valid JSON. \nError message: ${e.message}`);
  }
};

const parseConfigFile = (configFilePath) => {
  const config = parseJson(configFilePath);
  const normalizedConfig = normalizeConfig(config);

  return normalizedConfig;
}

const normalizeConfig = config => {
  const isOldConfig = !(config.hasOwnProperty('cells') || config.hasOwnProperty('app'));

  if (isOldConfig) {
    return config;
  }

  const { cells = {}, app = {} } = config;

  return Object.assign({}, cells, app);
};

const getFilesFromGlob = (pattern) => {
  if (typeof pattern === 'string') {
      pattern = [ pattern ];
  }

  return globby(pattern);
};

const getRegexGroups = (regex, string) => {
  let matches = [];
  let match = regex.exec(string);
  let index = 1;
  while (match && index < match.length) {
      if (match[index] !== undefined) {
        matches.push(match[index]);
      }
      index++;
  }
  return matches;
};

const replace = (source, ...args) => {
  for (let i = 0; i < args.length; i++) {
    source = source.replace('#{'+i+'}', args[i]);
  }
  return source;
};

const getDependenciesFile = (pathDir = process.cwd(), onlyFileName = false) => {
  for (let file of VERSION_FILES) {
    const filePath = path.join(pathDir, file);
    if (fs.existsSync(filePath)) {
        if (onlyFileName) {
          return filePath;
        } else {
          return parseJson(filePath);
        }
    }
  }
};

const getAllDependenciesFilenames = (pathDir) => {
  pathDir = pathDir || process.cwd();
  let dependenciesFiles = [];
  for (let file of VERSION_FILES) {
    const filePath = path.join(pathDir, file);
    if (fs.existsSync(filePath)) {
      dependenciesFiles.push(file);
    }
  }

  return dependenciesFiles;
};

const getPolymerVersion = () => {
  const polymerPath = path.join(getDependenciesFolder(), 'polymer');

  if (fs.existsSync(polymerPath)) {
      const dependenciesFiles = getAllDependenciesFilenames(polymerPath);

      if (dependenciesFiles) {
          for (let depFilename of dependenciesFiles) {
              const depFile = path.join(polymerPath, depFilename);

              if (fs.existsSync(depFile)) {
                  const contentFile = parseJson(depFile);

                  if (contentFile && contentFile.version) {
                      return contentFile.version;
                  }
              }
          }
      }
  }
};

const getBowerDependenciesFolder = () => {
  const bowerRc = fs.existsSync('.bowerrc') && parseJson('.bowerrc');

  return (bowerRc && bowerRc.directory) || 'bower_components';
};

/**
 * Returns the dependencies folder associated to the version file.
 * @param {String} pathDir: path where the version file should be
 * @returns {String} components folder associated to the version file
 */
const getDependenciesFolder = (pathDir) => {
  let dependenciesFolder;
  pathDir = pathDir || process.cwd();
  const dependenciesFile = getDependenciesFile(pathDir, true);
  const dependenciesFileName = path.basename(dependenciesFile ? dependenciesFile : '');

  if (dependenciesFileName === 'bower.json') {
    dependenciesFolder = getBowerDependenciesFolder();
  } else if (dependenciesFileName === 'package.json') {
    dependenciesFolder = 'node_modules';
  } else {
    throw new Error(`There is not version file in ${pathDir} directory`);
  }

  return dependenciesFolder;
};

const NPM = {
  file: 'package.json',
  folder: 'node_modules',
  binary: 'npm'
};

const BOWER = {
  file: 'bower.json',
  folder: getBowerDependenciesFolder(),
  binary: 'bower'
};

const getDependenciesInfo = (param) => {
  const dependenciesSets = [NPM, BOWER];
  for (let i = 0; i < dependenciesSets.length; i++) {
    const set = dependenciesSets[i];
    const keys = Object.keys(set);

    for (let j = 0; j < keys.length; j++) {
      if (set[keys[j]] === param) {
        return set;
      }
    }
  }
};

const getPackageName = (options) => {
  const versionFile = getDependenciesFile(options && options.root, false);

  return (options && options.packageName) ||
      (versionFile && versionFile.name) ||
      (options && options.root && path.basename(options.root));
};

const readFilesRecursiveSync = (dir, onlyFilenames=true, relativePaths=true) => {
  const root = `${dir || process.cwd()}${path.sep}`;
  return _readFilesRecursiveSyncAux(root, root, onlyFilenames, relativePaths);
};

const _readFilesRecursiveSyncAux = (root, dir, onlyFilenames, relativePaths, filelist=[]) => {
  let files = fs.existsSync(dir) ? fs.readdirSync(dir): [];
  const relativeDir = dir.replace(root, '');
  files.forEach(function(file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
          filelist = _readFilesRecursiveSyncAux(root, path.join(dir, file), onlyFilenames, relativePaths, filelist);
      }
      else {
          if (onlyFilenames) {
            filelist.push(file);
          } else if (relativePaths) {
            filelist.push(path.join(relativeDir, file));
          } else {
            filelist.push(path.join(dir, file));
          }
      }
  });
  return filelist;
};

const getPreconditionErrorMsg = (stepName) => {
  return `The ${stepName} preconditions do not match. A previous step failed.`;
};

const isDirectory = (path) => {
  try {
      return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
  } catch (ex) {
      throw ex;
  }
};

const directoryIsEmpty = (path) => {
  try {
      return fs.existsSync(path) && isDirectory(path) && fs.readdirSync(path).length === 0;
  } catch (ex) {
      throw ex;
  }
};

const removeSave = (path) => {
  try {
      return fs.existsSync(path) && fs.removeSync(path);
  } catch (ex) {
      throw ex;
  }
};

const requireLibraryGlobal = (libraryName) => {
  return new Promise((resolve, reject) => {
    npm.load(
      {
        global: true
      },
      error => {
        if (error) {
          reject(error);
        } else {
          npm.commands.root([], true, function (err, globalDir) {
            if (err) {
              reject(err);
            } else {
              try {
                const libraryObject = require(path.join(globalDir, libraryName));
                resolve(libraryObject);
              } catch(ex) {
                reject(`Could not import your global library ${libraryName}. Expected to be installed on ${globalDir}`);
              }
            }
          });
        }
      });
  });
};

const promiseSerial = initial => funcs => {
  return funcs.reduce((promise, func) => {
      return promise.then(func)
    },
    Promise.resolve(initial));
}

const _checkFileExists = file => {
  return new Promise((resolve, reject) => {
      logger().debug(`_checkFileExists: ${file}`);
      fs.access(file, fs.constants.F_OK, (err) => {
          if (err) {
              reject(`['${file}'] NOT FOUND`);
          } else {
              resolve();
          }
      });
  });
};

const _getCompsFromElements = parameters => {
  return new Promise((resolve, reject) => {
      logger().debug('_getCompsFromElements');
      const elementsDir = _getElementsDir();
      const isDirectory = path => fs.statSync(path).isDirectory();
      try {
          parameters.composer.elementsComponents = fs.readdirSync(elementsDir)
              .map(name => path.join(elementsDir, name))
              .filter(isDirectory)
              .map(dir => path.basename(dir));
          logger().debug(`Comps extracted from elements folder: ${parameters.composer.elementsComponents}`);
          resolve(parameters);
      } catch (e) {
          reject(e);
      }
  });
};


/// COMPOSER //////////////////////////////////////////////


const _getAppResourceFile = () => {
  return path.join(process.cwd(), composerConfig.composer.CC_APP_RESOURCES_FILE);
}


const _getBowerJsonFile = () => {
  return path.join(process.cwd(), composerConfig.composer.CC_BOWER_JSON_FILE);
};

const _getConfigsDir = () => {
  return path.join(process.cwd(), composerConfig.composer.CC_CONFIGS_DIR);
};

const _getElementsDir = () => {
  return path.join(process.cwd(), composerConfig.composer.CC_ELEMENTS_DIR);
};

const _getIdentity = () => {
  return `vnd.bbva.user-id:${composerConfig.composer.COMPOSER_API_IDENTITY}`;
};

const _getDateString = () => {
  return moment().format('DD-MM-Y_HH-mm-ss'); 
};

const _getDateStringDiag = () => {
  return moment().format('DD-MM-Y_HH-mm-ss');
};

const _buildEnvVarsArray = () => {
  const outputArray = [];
  for (const key of composerConfig.composer.EXPOSED_CONFIG_KEYS) {
      if (composerConfig.composer.hasOwnProperty(key)) {
          outputArray.push(`${key}=${composerConfig.composer[key]}`)
      }
  }
  return outputArray;
}

const _sanitizePathToUnix = path => {
  return (path !== undefined) ? path.replace(/\\/g, "/") : undefined;
}


/*********************************      SPOTY        *************************************************************************************/



const cl = param => {
    //console.log('\n***********************************************************\n');
    console.log(param);
    console.log('   ...........................................................................................\n');
   // process.exit(0)
};

const showError = err => {

  console.log(`
    ${red(err)}
  `);
  console.log('   ...........................................................................................\n');
  process.exit(0)
};


/* STRING RELATED METHODS *************************************************************************************/

const capitalizeWord = str => {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    return splitStr.join(' '); 
}

const replaceBackslash = string => string.replace('\\','');


/* URL RELATED METHODS *************************************************************************************/

    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    
    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while ( e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
        }


/* JSON RELATED METHODS *************************************************************************************/



const getJSON = res => res.json();




/* API RELATED METHODS *************************************************************************************/

// Create the api object with the credentials
let spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret
});



/* AUTH RELATED METHODS *************************************************************************************/

const clientCredentialsGrant = () => spotifyApi.clientCredentialsGrant();

const setToken = (data, params) => {
    spotifyApi.setAccessToken(data.body['access_token']);
    return params;
}


/**
 * flatten an array.
 * note, only goes one-level deep.
 */
function flatten(array) {
  return array.reduce((acc, el) => [...acc, ...el], []);
}

/**
 * chunk an array into an array of smaller sub-arrays
 */
function chunk(array, size) {
  return array.reduce((acc, el) => {
    const lastChunk = acc[acc.length - 1];
    if (lastChunk.length >= size) {
      acc.push([el]);
    } else {
      lastChunk.push(el);
    }
    return acc;
  }, [[]]);
}

/**
 * are the child arrays of this array all of equal length?
 */
function childrenAreEqualLength(array) {
  // empty is true. bad idea?
  if (!array.length) return true;
  return !array.some(child => child.length !== array[0].length);
}


/**
 * unzip arrays, like :
 * [ [a,b,c], [a,b,c], [a,b, c] ]
 * to
 * [ [a, a, a], [b, b, b], [c, c, c] ]
 */
function unzip(arr) {
  if (!(arr && arr.length)) return [];
  return arr[0].map((el, i) => arr.map(childArray => childArray[i]));
}

/**
 * wraps fetch to grab a url and parse it as text
 * @return {Promise.String}
 */
function fetchPage(url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        const err = new Error(`Bad response fetching page: ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return response.text();
    });
}

/**
 * Scrape the page for search terms from a selectors array.
 * If 2+ selectors are provided, they're merged and joined with whitespace.
 * @param  {String} page
 * @param  {Array} selector
 * @return {Array}
 */
function scrapeSearchTerms(page, selectors) {
  const $ = cheerio.load(page);

  const allResults = selectors.map(sel =>
    $(sel).map((i, el) => cheerio(el).text()).toArray().map(text => text.trim()),
  );

  if (!childrenAreEqualLength(allResults)) {
    throw new Error('Unable to merge selectors; results length mismatch');
  }

  return unzip(allResults)
    .map(subs => subs.join(' '))
    .filter(string => string.trim() !== '');
}


/**
 * 'Clean' a search string by removing terms that Spotify
 * doesn't handle well; namely 'and' to join 2 artists.
 * @param  {String} str
 * @return {String}
 */
function cleanSearchString(str) {
  return str.replace(/ and /gi, ' ');
}



module.exports = {
  cl,
  getJSON,
  spotifyApi,
  setToken,
  clientCredentialsGrant,
  showError,
  capitalizeWord,
  replaceBackslash,
  fetchPage,
  directoryIsEmpty,
  getAllDependenciesFilenames,
  getDependenciesFile,
  getDependenciesFolder,
  getDependenciesInfo,
  getFilesFromGlob,
  getPackageName,

  getPreconditionErrorMsg,
  getRegexGroups,
  isDirectory,
  parseJson,
  parseConfigFile,
  readFilesRecursiveSync,
  removeSave,
  replace,
  requireLibraryGlobal,
  promiseSerial,
  _checkFileExists,
  _getCompsFromElements,
  _getAppResourceFile,
  _getBowerJsonFile,
  _getConfigsDir,
  _getElementsDir,
  _getIdentity,
  _getDateString,
  _getDateStringDiag,
  _sanitizePathToUnix
};
