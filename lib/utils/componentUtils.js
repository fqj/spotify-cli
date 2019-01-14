'use strict';

const fs_pathExistsSync = require('fs-extra').pathExistsSync;
const path_basename = require('path').basename;
const path_join = require('path').join;
const { logger } = require('./logger');


const composerConfig = require('../../config/composer-config');

const { _getCommandsContainerName } = require('./containerUtils');
const { _forwardCommand } = require('./composerUtils');
//const { _getBowerDir } = require('./bowerUtils');
const { _getElementsDir } = require('./utils');

const { _removeSpecsFolder } = require('./specsUtils');

const _checkComponents = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_checkComponents');
        _forwardCommand([
                'app', 'load-comps',
            path_basename(parameters.composer.specsPathTmpDocker),
            '--check',
            '--rc',
            parameters.composer.cellsrcPathTmpDocker
            ], _getCommandsContainerName(), true
        ).then(() => {
            logger().debug('Components checked');
            resolve(parameters);
        }).catch(error => {
            _removeSpecsFolder(parameters.composer.specsTmpDir)(parameters)
                .then(() => reject(error))
                .catch(removalError => reject(removalError));
        });
    });
};

const _checkComponentsExist = componentArray => {
    const bowerDir = _getBowerDir();
    componentArray.forEach(comp => {
        if ( !fs_pathExistsSync(path_join(bowerDir, comp)) ) {
            throw new Error(
                `Folder '${path_join(bowerDir, comp)}' not found.\n` +
                `Please, be sure to run 'cells app:install before trying to import components in Composer`
            );
        }
    });
  };

const _extractCompName = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_extractCompName');
        _forwardCommand([
                'app', 'check-comp', (parameters.component ? parameters.component : ''),
                '--rc', parameters.composer.cellsrcPathTmpDocker,
                '--extract-name'
            ], _getCommandsContainerName())
        .then(compName => {
                logger().info(`Comp name extracted from command line: ${compName}`);
                parameters.composer.componentToCheck = compName;
                resolve(parameters);
        })
        .catch(reject);
    });
};

const _getBowerDir = () => path_join(process.cwd(), composerConfig.composer.CC_BOWER_DIR);


// LegacyName: __locateCheckComponent
const _locateComponentToCheck = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug(`_locateComponentToCheck: ${parameters.composer.componentToCheck}`);
  
        const bowerDir = _getBowerDir();
        const elementsDir = _getElementsDir();
  
        if (fs_pathExistsSync(path_join(bowerDir, parameters.composer.componentToCheck))) {
            logger().debug(`Comp to check located at bower`);
            resolve('bower');
        } else if (fs_pathExistsSync(path_join(elementsDir, parameters.composer.componentToCheck))) {
            logger().debug(`Comp to check located at element`);
            resolve('element');
        } else {
            reject(`Could not find component [${parameters.composer.componentToCheck}] neither in '${bowerDir}' nor in'${elementsDir}`);
        }
    });
  };

const _appendComponentType = parameters => componentType => {
    logger().debug('_appendComponentType');
    parameters.composer.componentType = componentType;
    return parameters;
};

module.exports = { 
    _checkComponents,
    _checkComponentsExist,
    _extractCompName,
    _locateComponentToCheck,
    _appendComponentType
}