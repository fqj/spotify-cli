'use strict';

const path_join = require('path').join;
const { logger } = require('./logger');


const composerConfig = require('../../config/composer-config');

const { _getCommandsContainerName } = require('./containerUtils');
const { _forwardCommand } = require('./composerUtils');
const { _copyArchiveToCommandsDocker, _getTmpFileOnDocker } = require('./dockerUtils');
const { _getConfigsDir, _checkFileExists } = require('./utils');
const { _checkComponentsExist } = require('./componentUtils');

// LegacyName: __getBowerJsonFile
const _getBowerJsonFile = () => {
    return path_join(process.cwd(), composerConfig.composer.CC_BOWER_JSON_FILE);
  };
  
  const _getBowerDir = () => {
    return path_join(process.cwd(), composerConfig.composer.CC_BOWER_DIR);
  };

const _appendBowerJsonPath = parameters => {
    logger().debug('_appendBowerJsonPath');
    parameters.composer.bowerJsonPath = _getBowerJsonFile();
    return parameters;
};

const _requireBowerJson = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireBowerJson');
        _checkFileExists(parameters.composer.bowerJsonPath).then(() => {
            logger().debug('bower.json File found');
            resolve(parameters)
        }).catch(() => {
            reject(`bower.json File not found: [${parameters.composer.bowerJsonPath}]`);
        });
    });
};

const _appendBowerJsonDockerPath = parameters => {
    logger().debug('_appendBowerJsonDockerPath');
    parameters.composer.bowerJsonPathTmpDocker = _getTmpFileOnDocker(parameters.composer.bowerJsonPath);
    return parameters;
};

const _copyBowerJsonToDocker = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_copyBowerJsonToDocker');
        _copyArchiveToCommandsDocker(parameters.composer.bowerJsonPath, parameters.composer.bowerJsonPathTmpDocker).then(() => {
            logger().debug(`App's temporal bower.json file: ${parameters.composer.bowerJsonPathTmpDocker}`);
            resolve(parameters);
        }).catch((err) => {
            reject(err);
        });
    });
};

const _getCompsFromBowerJson = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_getCompsFromBowerJson');
        _forwardCommand([
                'app', 'load-comps',
                (parameters.force ? '--force' : ''),
                (parameters.fcc ? `--fcc ${parameters.fcc}` : ''),
            `--bower ${parameters.composer.bowerJsonPathTmpDocker}`,
            `--rc ${parameters.composer.cellsrcPathTmpDocker}`
            ], _getCommandsContainerName()
        ).then((bowerComponents) => {
            logger().debug(`Comps extracted from bower.json: ${bowerComponents}`);
            parameters.composer.bowerComponents = bowerComponents !== '' ? bowerComponents.split(' ') : [];
            resolve(parameters);
        }).catch(reject);
    });
};

const _getThemesFromBowerJson = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_getThemesFromBowerJson');
        _forwardCommand([
                'app', 'load-comps',
                (parameters.force ? '--force' : ''),
                (parameters.fcc ? `--fcc ${parameters.fcc}` : ''),
            `--bower ${parameters.composer.bowerJsonPathTmpDocker}`,
            '--styles',
            `--rc ${parameters.composer.cellsrcPathTmpDocker}`
            ], _getCommandsContainerName()
        ).then((bowerThemes) => {
            logger().debug(`Themes and icons extracted from bower.json: ${bowerThemes}`);
            parameters.composer.bowerThemes = bowerThemes !== '' ? bowerThemes.split(' ') : [];
            resolve(parameters);
        }).catch(reject);
    });
};

const _requireCompsToBeAlreadyDownloaded = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireCompsToBeAlreadyDownloaded');
            try {
            _checkComponentsExist(parameters.composer.bowerComponents);
            logger().debug('Comps already installed in \'components\' folder');
            resolve(parameters);
            } catch (e) {
                reject(e);
            }
        });
};

const _requireThemesToBeAlreadyDownloaded = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireThemesToBeAlreadyDownloaded');
            try {
            _checkComponentsExist(parameters.composer.bowerThemes);
            logger().debug('Themes already installed in \'components\' folder');
            resolve(parameters);
            } catch (e) {
                reject(e);
            }
        });
};

module.exports = { 
    _appendBowerJsonPath,
    _requireBowerJson,
    _appendBowerJsonDockerPath,
    _copyBowerJsonToDocker,
    _getCompsFromBowerJson,
    _getThemesFromBowerJson,
    _requireCompsToBeAlreadyDownloaded,
    _requireThemesToBeAlreadyDownloaded,
    _getBowerDir
}