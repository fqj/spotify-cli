'use strict';

const path_join = require('path').join;
const { spawn } = require('child_process');
const { logger } = require('./logger');
const os_userInfo = require('os').userInfo;



const composerConfig = require('../../config/composer-config');

const { 
    killContainer, 
    _getLivePreviewContainerName, 
    _getCommandsContainerName,
    _getContainerInfo,
    _getApiContainerName, 
    _stopAllLivePreviewContainers
} = require('./containerUtils');

const { 
    _forwardCommand, 
    _setHostMachineIp
} = require('./composerUtils');

const { 
    _getContainerPort, 
    _setLivePreviewPorts, 
    _setIdleNetworkIfNotStarted
} = require('./portsUtils');

const {
    _expandDockerComposeYML, 
    _requireDockerComposeYML, 
    dockerComposeRmi,
    removeImage
} = require('./dockerUtils');


const _createLivePreviewContainer = (containerName, imageName, apiPort, appId) => {
    logger().debug("_createLivePreviewContainer");
    return new Promise((resolve, reject) => {

        logger().debug(`Creating container: ${containerName}`);
        
        const shellCommand = `docker run --rm -d `+
            `-e ENGINE_API_PORT="${apiPort}" -e ENGINE_APP_ID=${appId} -e ENGINE_PLATFORM_ID="desktop" `+
            `-p ${composerConfig.composer.COMPOSER_LIVE_PREVIEW_PORT}:8080 -e HOST_USER_ID="${os_userInfo().uid}" `+
            `-v "${path_join(process.cwd(), 'components')}:/opt/nginx/html/live-preview/components" `+
            `-v "${path_join(process.cwd(), 'app', 'elements')}:/opt/nginx/html/live-preview/elements" `+
            `-v "${process.cwd()}:/app-composer" `+
            `--name="${containerName}" `+
            `${imageName}`;

        const spawned = spawn(shellCommand, [], {stdio: 'inherit', shell: true});

        let error = null;
        spawned.on('error', (_error) => {
            error = _error;
            reject('Error on docker run');
        });

        spawned.on('exit', (code) => {
            if ( code !== 0 || error !== null ) {
                reject('Error on docker run');
            } else {
                resolve();
            }
        });

    });
};

const _attachLivePreview = parameters => {
    composerConfig.composer.LIVE_PREVIEW_DOCKER = `${composerConfig.composer.ZELLS_REPO}/composer-live-preview:${composerConfig.composer.CELLS_TAG_VERSION}`
    return new Promise((resolve, reject) => {
        logger().debug('_attachLivePreview');
        const livePreviewContainerName = _getLivePreviewContainerName(parameters.composer.appId);
        _getContainerInfo(livePreviewContainerName)
            .then(() => {
                logger().info(`LivePreview ALREADY ATTACHED for [${parameters.composer.appId}]`);
                resolve(parameters);
            })
            .catch(() => {
                Promise.resolve(parameters)
                    .then(_setLivePreviewPorts)
                    .then(_setHostMachineIp)
                    .then(() => _getContainerPort(_getApiContainerName()))
                    .then(apiPort => _createLivePreviewContainer(livePreviewContainerName, composerConfig.composer.LIVE_PREVIEW_DOCKER, apiPort, parameters.composer.appId))
                    .then(() => {
                        logger().debug(`Registering ${composerConfig.composer.COMPOSER_HOST_MACHINE_IP}-${composerConfig.composer.COMPOSER_LIVE_PREVIEW_PORT} as port for app`);
                        return _addPortToLivePreview(
                            `${composerConfig.composer.COMPOSER_HOST_MACHINE_IP}-${composerConfig.composer.COMPOSER_LIVE_PREVIEW_PORT}`,
                            parameters.composer.cellsrcPathTmpDocker
                        );
                    })
                    .then(() => {
                        logger().info(`LivePreview ATTACHED for [${parameters.composer.appId}]`);
                        resolve(parameters);
                    },
                        () => reject(`Error while attaching LivePreview for [${parameters.composer.appId}]. Check your connection or contact support if persists.`)
                    );
            });
    });
};

const _addPortToLivePreview = (port, cellsrc) => {
    logger().debug('_addPortToLivePreview');
    return  _forwardCommand([
        'app', 'lp-add-port', port, '--rc', cellsrc
    ], _getCommandsContainerName())
};

const _detachLivePreview = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_detachLivePreview');
        const livePreviewContainerName = _getLivePreviewContainerName(parameters.composer.appId);
        killContainer(livePreviewContainerName).then(() => {
            _removePortToLivePreview(parameters.composer.cellsrcPathTmpDocker).then(() => {
                logger().info(`LivePreview DETACHED for [${parameters.composer.appId}]`);
                resolve(parameters);
            }).catch(err => {
                reject(`Error while detaching LivePreview for [${parameters.composer.appId}]: ${err}`);
            });
        }).catch(() => {
            logger().info(`LivePreview DETACHED for [${parameters.composer.appId}]`);
        });
    });
};

const _removePortToLivePreview = cellsrc => {
    logger().debug('_removePortToLivePreview');
    return _forwardCommand([
        'app', 'lp-remove-port', '--rc', cellsrc
    ], _getCommandsContainerName())
};

const _checkLivePreviewStatus = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_checkLivePreviewStatus');
        return _getContainerInfo(_getLivePreviewContainerName(parameters.composer.appId)).then(() => {
            logger().info(`LivePreview STARTED for [${parameters.composer.appId}]`)
            resolve(parameters);
        }).catch(() => {
            logger().info(`LivePreview STOPPED for [${parameters.composer.appId}]`)
            resolve(parameters);
        });
    });
};

// LegacyName: platform_fnCleanImages
const _cleanImages = parameters => {
    logger().debug('_cleanImages');
    logger().info('Deleting Containers & Cleaning images...');
    return Promise.resolve(parameters)
        .then(_setIdleNetworkIfNotStarted)
        .then(_expandDockerComposeYML)
        .then(_requireDockerComposeYML)
        .then(parameters => dockerComposeRmi({projectName: composerConfig.composer.CELLS_TAG_VERSION, file: parameters.composer.dockerComposeTmpFile})(parameters))
};

const _cleanLivePreviewImage = parameters => {
    logger().debug('_cleanLivePreviewImage');
    return Promise.resolve(parameters)
    .then(_stopAllLivePreviewContainers)
    .then(_removeLivePreviewImage);
};

// LegacyName: da_fnLivePreviewCleanImage
const _removeLivePreviewImage = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_removeLivePreviewImage');
        removeImage(composerConfig.composer.LIVE_PREVIEW_DOCKER).then(messages => {
            messages.forEach(message => logger().info(`${Object.keys(message)[0]}: ${message[Object.getOwnPropertyNames(message)]}`));
            resolve(parameters);
        }).catch(e => {
            (e && e.json && e.json.message ? logger().warn(e.json.message) : logger().error(e));
            resolve(parameters);
        });
    });
};

module.exports = {
    _attachLivePreview,
    _detachLivePreview,
    _checkLivePreviewStatus,
    _cleanImages,
    _cleanLivePreviewImage
}
