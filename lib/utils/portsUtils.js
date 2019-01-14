'use strict';

const { logger } = require('./logger');
const portfinder_getPortPromise = require('portfinder').getPortPromise;

const composerDevPorts = require('../../config/composer-ports');
const composerConfig = require('../../config/composer-config');

const { promiseSerial } = require('./utils');
const {
        _getApiContainerName,
        _getRedisContainerName,
        _getContainerInfo,
        _getUIContainerName,
        _getCommandsContainerName } = require('./containerUtils');


const _setApiAddressIP = parameters => {
    composerConfig.composer.COMPOSER_API_HOST = parameters.docker.CELLS_DOCKER_HOST_IP;
    logger().debug(`COMPOSER_API_HOST set to ${composerConfig.composer.COMPOSER_API_HOST}`);
    return parameters;
};

// LegacyName: __fnSetLivePreviewPort
const _setLivePreviewPorts = parameters => {
    return new Promise((resolve, reject) => {
        _resolveLivePreviewPorts().then(portMap => {
            _setAndSavePorts(portMap);
            logger().debug(`Assigned ports: ${Array.from(portMap.values())}`);
            resolve(parameters);
        }).catch(reject);
    });
};

const _setComposerPorts = parameters => {
    return new Promise((resolve, reject) => {
        _resolveComposerPorts().then(portMap => {
            _setAndSavePorts(portMap);
            logger().debug(`Assigned ports: ${Array.from(portMap.values())}`);
            resolve(parameters);
        }).catch(reject);
    });
};

const _setAndSavePorts = portMap => {
    portMap.forEach((value, key) => composerConfig.composer[key] = value);
};

const _getDevComposerPortAssignments = () => {
    return Promise.resolve(composerDevPorts.DEV_PORTS.composer);
};

const _resolveComposerPorts = () => {
    logger().debug('Resolving composer ports...');
    let portMapPromise;
    if ( composerConfig.composer.CELLS_KNOWN_PORTS === 'DEV' ) {
        portMapPromise = _getDevComposerPortAssignments();
    } else {
        portMapPromise = _getAvailableComposerPorts();
    }
    return portMapPromise;
};

/**
 * Finds for an open port starting at 20000
 * This range is usually empty
 * Looks for available non-open ports on ipV4 addresses over TCP protocol for any address (0.0.0.0) and port (the specified)
 * 
 * Anything that is not "DEV" is considered "REL"
 * LegacyName: __fnSetPortsLivePreview?
 */
const _getAvailableLivePreviewPorts = () => {
    return new Promise((resolve, reject) => {
        logger().debug('_getAvailablePorts');
        const portsNeeded = 1;
        const portArray = [];
        const startingPort = 20000;
        const functionsArray = Array.from({length: portsNeeded}).map(() => _findAndSaveAvailablePort(portArray));
        promiseSerial(startingPort)(functionsArray)
            .then(() => resolve(_createPortMapFromPortArray(Array.from(composerDevPorts.DEV_PORTS.livePreview.keys()), portArray)))
            .catch(reject);
    });
};

const _createPortMapFromPortArray = (portKeysArrays, portArray) => {
    return new Map(portArray.map((port, index) => [portKeysArrays[index], port]));
};

/**
 * Finds an available port starting from port, saves it on portArray and
 * returns the next port to test.
 */
const _findAndSaveAvailablePort = portArray => port => {
    return new Promise((resolve, reject) => {
        portfinder_getPortPromise({ host: '0.0.0.0', port })
            .then((port) => {
                portArray.push(port);
                resolve(port + 1);
            })
            .catch(reject);
    });
};

/**
 * Finds for an open port starting at 20000
 * This range is usually empty
 * Looks for available non-open ports on ipV4 addresses over TCP protocol for any address (0.0.0.0) and port (the specified)
 * 
 * Anything that is not "DEV" is considered "REL"
 * LegacyName: __fnSetPorts
 */

const _getAvailableComposerPorts = () => { //FQJ tienes que terminar esto
    return new Promise((resolve, reject) => {
        logger().debug('_getAvailablePorts');
        const portsNeeded = 5;
        const portArray = [];
        const startingPort = 20000;
        const functionsArray = Array.from({length: portsNeeded}).map(() => _findAndSaveAvailablePort(portArray));
        promiseSerial(startingPort)(functionsArray)
            .then(() => resolve(_createPortMapFromPortArray(Array.from(composerDevPorts.DEV_PORTS.composer.keys()), portArray)))
            .catch(reject);
    });
};

const _resolveLivePreviewPorts = () => {
    logger().debug('Resolving livePreview ports...');
    let portMapPromise;
    if ( composerConfig.composer.CELLS_KNOWN_PORTS === 'DEV' ) {
        portMapPromise = _getDevLivePreviewPortAssignments();
    } else {
        portMapPromise = _getAvailableLivePreviewPorts();
    }
    return portMapPromise;
};

const _getDevLivePreviewPortAssignments = () => {
    return Promise.resolve(composerDevPorts.DEV_PORTS.livePreview);
};

const _showPorts = parameters => {
    logger().debug('_showPorts');
    logger().info('  \n  COMPOSER PORTS:');
    logger().info('  NAME\t\t PORT');
    logger().info('  _____________________');
    logger().info(`  UI\t\t ${composerConfig.composer.COMPOSER_UI_PORT}`);
    logger().info(`  API\t\t ${composerConfig.composer.COMPOSER_API_PORT}`);
    logger().info(`  COMMANDS\t ${composerConfig.composer.COMPOSER_COMMANDS_PORT}`);
    logger().info(`  COMMANDS_HTTP\t ${composerConfig.composer.COMPOSER_COMMANDS_HTTP_PORT}`);
    logger().info(`  DB\t\t ${composerConfig.composer.COMPOSER_REDIS_PORT}\n`);
    return parameters;
};

// invocations:
//   type A => _getContainerPort containerA
//   type B => _getContainerPort containerA 9988
//             The second param in type B is the EXPOSE-d port "inside" the Docker
// LegacyName: __fnGetContainerPort
const _getContainerPort = (container, _port = null) => {
    return new Promise( resolve => {
        logger().debug(`_getContainerPort, container: ${container}, port: ${_port}`);
        _getContainerInfo(container).then(containerInfo => {
            const { NetworkSettings: { Ports: ports } } = containerInfo;
            const getFirstPort = portSettings => portSettings[Object.keys(portSettings)[0]][0];
            const { HostPort: port } = _port !== null
                ? ( ports[`${_port}/tcp`].length && ports[`${_port}/tcp`][0] || 'NOT-AVAILABLE|NOT-STARTED-CB')
                : ( Object.keys(ports).length && ports[Object.keys(ports)[0]].length && getFirstPort(ports) || 'NOT-AVAILABLE|NOT-STARTED-CB');
            resolve(port);
        }).catch(() => {
            resolve('NOT-AVAILABLE|NOT-STARTED-CB');
        });
    });
}

// LegacyName: platform_fnCBLocateNetwork
const _locateNetwork = (parameters, isComposerUp) => {
    return new Promise((resolve, reject) => {
        logger().debug('_locateNetwork');
        // Network
        _setApiAddressIP(parameters);

        const portVarKeys = Array.from(composerDevPorts.DEV_PORTS.composer.keys());
        // Ports
        if(isComposerUp) {
            Promise.all([
                _getContainerPort(_getApiContainerName()),
                _getContainerPort(_getUIContainerName()),
                _getContainerPort(_getRedisContainerName()),
                _getContainerPort(_getCommandsContainerName(), composerDevPorts.COMPOSER_COMMANDS_PORT_INTERNAL),
                _getContainerPort(_getCommandsContainerName(), composerDevPorts.COMPOSER_COMMANDS_HTTP_PORT_INTERNAL)
            ]).then((ports => {
                ports.forEach((port, index) => composerConfig.composer[portVarKeys[index]] = port);
                resolve(parameters);
            })).catch(reject)
        } else {
            portVarKeys.forEach((port, index) => composerConfig.composer[portVarKeys[index]] = "COMPOSER_NOT_STARTED");
            resolve(parameters);
        }
    });
};

// LegacyName: platform_fnUrl
const _getDockerHostUrl = parameters => {

    const activeApp = parameters.cellsProject.composer.appId;
    const activeDraft = parameters.cellsProject.composer.activeDraft;

    return new Promise((resolve, reject) => {
        _getContainerPort(_getUIContainerName()).then(port => {
            const landing = '/index.html#!/page-list/';
            const platform = 'desktop';
            parameters.url = `http://${parameters.docker.CELLS_DOCKER_HOST_IP}:${port}${landing}${activeApp}?draft=${activeDraft}${encodeURI('&')}platform=${platform}`;
            resolve(`http://${parameters.docker.CELLS_DOCKER_HOST_IP}:${port}${landing}${activeApp}?draft=${activeDraft}${encodeURI('&')}platform=${platform}`);
        }).catch(reject);
    });
}

// LegacyName: platform_fnCBSetIdleNetworkIfNotStarted
const _setIdleNetworkIfNotStarted = parameters => {
    logger().debug('_setIdleNetworkIfNotStarted');
    const portVarKeys = Array.from(composerDevPorts.IDLE_NETWORK_PORTS.keys());
    const portVarValues = Array.from(composerDevPorts.IDLE_NETWORK_PORTS.values());
    portVarKeys.forEach((key, index) => {
        if (composerConfig.composer[key] === 'NOT-AVAILABLE|NOT-STARTED-CB') {
            composerConfig.composer[key] = portVarValues[index];
        }
    });
    return parameters;
};


module.exports = {
    _setLivePreviewPorts,
    _setComposerPorts,
    _setIdleNetworkIfNotStarted,
    _showPorts,
    _getContainerPort,
    _locateNetwork,
    _getDockerHostUrl
}