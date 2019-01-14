'use strict';

const fs_readdirSync = require('fs').readdirSync;
const fs_existsSync = require('fs').existsSync;
const path_join = require('path').join;
const { logger } = require('./logger');
const g = require('chalk').green;
const R_path = require('ramda').path;

const composerConfig = require('../../config/composer-config');

const { _getCommandsContainerName, _getLivePreviewContainerName } = require('./containerUtils');
const { _forwardCommand } = require('./composerUtils');
const { _getConfigsDir } = require('./utils');
const { _copyArchiveToCommandsDocker,
        _copyArchiveToLivePreviewDocker,
        _getTmpFileOnDocker,
        _getLocalesFolderOnDocker,
        _getStylesFolderOnDocker } = require('./dockerUtils');


const STYLES_DOCKER_PATH = '/dist-composer/app/styles';

const _appendConfigs = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendConfigs');
        // Copy configs files to docker
        try {
            const configsLocal = [ composerConfig.composer.FILE_CONFIG_PATH ];
            const configsDocker = configsLocal.map(_getTmpFileOnDocker);
            const promiseArray = configsLocal.map((config, index) => {
                logger().debug(`Copying config '${config}' to container ${_getCommandsContainerName()}`);
                return _copyArchiveToCommandsDocker(config, configsDocker[index]);
            });
            Promise.all(promiseArray).then(() => {
                parameters.composer.configsDocker = configsDocker;
                resolve(parameters);
            }).catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};

// LegacyName: __loadConfigs
const _loadConfigs = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_loadConfigs');
        _forwardCommand([
                'app', 'load-configs',
                ...parameters.composer.configsDocker,
                '--rc', parameters.composer.cellsrcPathTmpDocker
            ], _getCommandsContainerName(), true)
        .then(() => {
            logger().info(`From folder: ${_getConfigsDir()}`);
            logger().debug(`Configs extracted from app: ${_getConfigs()}`);
            resolve(parameters);
        })
        .catch(reject);
    });
};

const _getConfigs = () => {
    logger().debug('_getConfigs');
    const configsDir = _getConfigsDir();
    const configFiles = [];
    try {
        const configs = fs_readdirSync(configsDir).filter(file => file.endsWith('.json'));
        for (const config of configs) {
            const fullConfigFile = path_join(configsDir, config);
            configFiles.push(fullConfigFile);
        }
        return configFiles;
    } catch (error) {
        throw new Error('Something went wrong...');
    }
};



const _appendSegmentations = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendSegmentations');
        // Copy segmentations files to docker
        let segmentationsLocal = [ ];
        let templateProvided = R_path(['commandOptions','_all','template'], parameters);
        
        if(templateProvided === undefined) {
            templateProvided = 'segmentations.json'
        }

        if(templateProvided === null) {
            console.log(`Segmentations Basic Template:
            [
                {
                  "segmentation": "Sample Segmentation",
                  "name": "Basic Segmentation",
                  "desc": "Basic Segmentation Description",
                  "segments": [
                    {
                      "segment": "segmentId-blue",
                      "name": "blue",
                      "desc": "Segment blue description"
                    },
                    {
                      "segment": "segmentId-private",
                      "name": "private",
                      "desc": "Segment private description"
                    },
                    {
                      "segment": "segmentId-regular",
                      "name": "regular",
                      "desc": "Segment regular description"
                    }
                  ]
                }
            ]`)

            process.exit(2)
        }

        try {
            segmentationsLocal = [ `${composerConfig.composer.FILE_SEGMENTATION_PATH}/${templateProvided}` ];
            
            if (!fs_existsSync(segmentationsLocal[0])) {
                logger().warn(`File '${segmentationsLocal[0]}' doesn't exists. Type ${g('cells app:composer:load-segmentations -h')} to get a template.`);
                resolve({"parameters": parameters, "fileExists": false});
            }
            const segmentationsDocker = segmentationsLocal.map(_getTmpFileOnDocker);
            const promiseArray = segmentationsLocal.map((segmentation, index) => {
                logger().debug(`Copying segmentations '${segmentation}' to container ${_getCommandsContainerName()}`);
                return _copyArchiveToCommandsDocker(segmentation, segmentationsDocker[index]);
            });
            Promise.all(promiseArray).then(() => {
                parameters.composer.segmentationsDocker = segmentationsDocker;
                resolve({"parameters": parameters, "fileExists": true});
            }).catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};

// LegacyName: __loadSegmentationss
const _loadSegmentations = ({parameters, fileExists}) => {
    if(fileExists) {
        let template = R_path(['commandOptions','_all','template'], parameters);
        
        if(template === undefined) {
            template = 'segmentations.json'
        }
        return new Promise((resolve, reject) => {
            logger().debug('_loadSegmentations');
            _forwardCommand([
                    'app', 'load-segmentations',
                    ...parameters.composer.segmentationsDocker,
                    '--rc', parameters.composer.cellsrcPathTmpDocker
                ], _getCommandsContainerName(), true)
            .then(() => {
                logger().info(`Segmentations extracted from file: ${_getSegmentations(template)}`) 
            })
            .catch(reject);
        }); 
    }
};

const _getSegmentations = (template) => {
    logger().debug('_getSegmentations');
    const segmentationsDir = _getPathDir(composerConfig.composer.CC_SEGMENTATIONS_DIR);
    const segmentationFiles = [];
    try {
        const segmentations = fs_readdirSync(segmentationsDir).filter(file => file === template );
        for (const segmentation of segmentations) {
            const fullSegmentationFile = path_join(segmentationsDir, segmentation);
            segmentationFiles.push(fullSegmentationFile);
        }
        return segmentationFiles;
    } catch (error) {
        throw new Error('Something went wrong...');
    }
};

const _appendLocales = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendLocales');
        // Copy locales files to docker
        try {
            const localesLocal = [ composerConfig.composer.FILE_LOCALES_PATH ];
            const localesDocker =  '/dist-composer/app/locales'; 
            const promiseArray = localesLocal.map((locale, index) => {

                logger().info(`Copying locales '${locale}' to container  ${_getLivePreviewContainerName(parameters.cellsProject.composer.appId)}`);
                return _copyArchiveToLivePreviewDocker(locale, localesDocker, parameters);
            });
            Promise.all(promiseArray).then(() => {
                parameters.composer.localesDocker = localesDocker;

                resolve(parameters);
            }).catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};


const _loadLocales = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_loadLocales');
        _forwardCommand([
                'app', 'load-locales',
                ...parameters.composer.localesDocker,
                '--rc', parameters.composer.cellsrcPathTmpDocker
            ], _getLivePreviewContainerName(parameters.cellsProject.composer.appId), true)
        .then(() => {
            logger().info(`From folder: ${_getPathDir(composerConfig.composer.CC_LOCALES_DIR)}`);
            logger().debug(`Locales extracted from app: ${_getLocales()}`) 
        })
        .catch(reject);
    });
};

const _getLocales = () => {
    logger().debug('_getLocales');
    const localesDir = _getPathDir(composerConfig.composer.CC_LOCALES_DIR);
    const localeFiles = [];
    try {
        const locales = fs_readdirSync(localesDir).filter(file => file.endsWith('.json'));
        for (const locale of locales) {
            const fullLocaleFile = path_join(localesDir, locale);
            localeFiles.push(fullLocaleFile);
        }
        return localeFiles;
    } catch (error) {
        throw new Error('Something went wrong...');
    }
};

const _appendStyles = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendStyles');
        // Copy styles files to docker
        try {
            const stylesLocal = [ composerConfig.composer.FILE_STYLES_PATH ];

            const promiseArray = stylesLocal.map((style, index) => {
                logger().debug(`Copying styles '${style}' to container ${_getLivePreviewContainerName(parameters.cellsProject.composer.appId)}`);

                return _copyArchiveToLivePreviewDocker(style, STYLES_DOCKER_PATH, parameters);
            });
            Promise.all(promiseArray).then(() => {
                parameters.composer.stylesDocker = STYLES_DOCKER_PATH;
                resolve(parameters);
            }).catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};

const _loadStyles = parameters => {

    return new Promise((resolve, reject) => {
        logger().debug('_loadStyles');
        _forwardCommand([
                'app', 'load-styles',
                ...parameters.composer.stylesDocker,
                '--rc', parameters.composer.cellsrcPathTmpDocker
            ], _getLivePreviewContainerName(parameters.cellsProject.composer.appId), true)
        .then(() => {
            logger().info(`From folder: ${_getPathDir(composerConfig.composer.CC_STYLES_DIR)}`);
            logger().debug(`Styles extracted from app: ${_getStyles()}`) 
        })
        .catch(reject);
    });
};



const _getStyles = () => {
    logger().debug('_getStyles');

    const stylesDir = _getPathDir(composerConfig.composer.CC_STYLES_DIR);
    const styleFiles = [];
    try {
        const styles = fs_readdirSync(stylesDir).filter(file => file.endsWith('.css'));
        for (const style of styles) {
            const fullStyleFile = path_join(stylesDir, style);
            styleFiles.push(fullStyleFile);
        }
        return styleFiles;
    } catch (error) {
        throw new Error('Something went wrong...');
    }
};

const _getPathDir = _path => {
    return path_join(process.cwd(), _path);
};

module.exports = { 
    _appendConfigs,
    _loadConfigs,
    _appendSegmentations,
    _loadSegmentations,
    _appendStyles,
    _loadStyles,
    _appendLocales,
    _loadLocales
}