'use strict';


const docker = require('dockerode')();
const { logger } = require('./logger')
const g = require('chalk').green;
const composerConfig = require('../../config/composer-config');


/********************************************
/*
/*    Get names of Containers Funcions
/*
/*******************************************/

// UTILS

const _removeDots = str => {
    // logger().debug('_removeDots');
    return str.replace(/\./g, '');
}

const _removeVersionFromName = name => {
    return name.replace(_removeDots(composerConfig.composer.CELLS_TAG_VERSION_LOWER) + "_", "");
}

const _findContainerFullName = shortName => {
    // logger().debug('_findContainerFullName');
    return new Promise(resolve => {
        _getAllContainersName().then(nameList => {
            resolve(nameList.find(name => {
                return name.startsWith(shortName)
            }));
        })
    })
}

const _getContainerFullName = name => {
    // logger().debug('_getContainerFullName');
    return composerConfig.composer.CELLSBOX_CONTAINERS.find(containerName => {
        return (containerName != undefined) ? containerName.startsWith(name) : undefined 
    });
}

// UI CONTAINER

const _uiContainerBaseName = () => {
    // logger().debug('_uiContainerBaseName');
    return `${_removeDots(composerConfig.composer.CELLS_TAG_VERSION_LOWER)}_composer_ui`;
}

const _findUIContainerName = () => {
    // logger().debug('_findUIContainerName');
    return _findContainerFullName(_uiContainerBaseName());
};

// LegacyName: __fnComposerUIDocker
const _getUIContainerName = () => {
    // logger().debug('_getUIContainerName');
    return _getContainerFullName(_uiContainerBaseName());
}


// API CONTAINER

const _apiContainerBaseName = () => {
    // logger().debug('_apiContainerBaseName');
    return `${_removeDots(composerConfig.composer.CELLS_TAG_VERSION_LOWER)}_composer_api`;
}

const _findApiContainerName = () => {
    // logger().debug('_findApiContainerName');
    return _findContainerFullName(_apiContainerBaseName());
};

// LegacyName: __fnComposerApiDocker
const _getApiContainerName = () => {
    // logger().debug('_getApiContainerName');
    return _getContainerFullName(_apiContainerBaseName());
}

// REDIS CONTAINER

const _redisContainerBaseName = () => {
    // logger().debug('_redisContainerBaseName');
    return `composer_composer_db`;
}

const _findRedisContainerName = () => {
    // logger().debug('_findRedisContainerName');
    return _findContainerFullName(_redisContainerBaseName());
};

// LegacyName: __fnComposerRedisDocker
const _getRedisContainerName = () => {
    // logger().debug('_getRedisContainerName');
    return _getContainerFullName(_redisContainerBaseName());
}

// COMMANDS CONTAINER

const _commandsContainerBaseName = () => {
    // logger().debug('_commandsContainerBaseName');
    return `${_removeDots(composerConfig.composer.CELLS_TAG_VERSION_LOWER)}_composer_commands`;
}

const _findCommandsContainerName = () => {
    // logger().debug('_findCommandsContainerName');
    return _findContainerFullName(_commandsContainerBaseName());
};

// LegacyName: __fnComposerCommandsDocker
const _getCommandsContainerName = () => {
    // logger().debug('_getCommandsContainerName');
    return _getContainerFullName(_commandsContainerBaseName());
}


// LIVE-PREVIEW CONTAINER

// LegacyName: __fnComposerLivePreviewDocker
const _getLivePreviewContainerName = appId => {

    if (composerConfig.composer.CELLS_TAG_VERSION_LOWER.indexOf('.') !== -1) {
        return `${composerConfig.composer.CELLS_TAG_VERSION_LOWER.replace(/\./g, '')}_composer-live-preview-${appId}`;
    }
    return `${composerConfig.composer.CELLS_TAG_VERSION_LOWER}_composer-live-preview-${appId}`;
}

// LegacyName: __fnComposerLivePreviewDockerPrefix
const _getLivePreviewContainerNamePrefix = () => {
    if (composerConfig.composer.CELLS_TAG_VERSION_LOWER.indexOf('.') !== -1) {
        return `${composerConfig.composer.CELLS_TAG_VERSION_LOWER.replace(/\./g, '')}_composer-live-preview`;
    }
    return `${composerConfig.composer.CELLS_TAG_VERSION_LOWER}_composer-live-preview`;
};

/**
 * Get container info.
 * Param 'container' may be an id or a name
 * 
 * * @param {string} container - Id or name of the container
 * * @returns Promise
 */
const _getContainerInfo = container => {
    return docker.getContainer(container).inspect();
};

/****************************************************
 * 
 *          GET CONTAINERS FUNCTIONS 
 * 
 *          @returns Promise
 * 
 ****************************************************/


const _getContainers = () => {
    return new Promise((resolve, reject) => {
        docker.listContainers().then(rawList => {
            resolve(_trimStartingForwardSlash(rawList));
        }).catch(reject);
    });
}

const _getContainerBaseNames = () => {
    return [_uiContainerBaseName(), _apiContainerBaseName(), _redisContainerBaseName(), _commandsContainerBaseName()]
}


const _getAllContainers = () => {
    return new Promise((resolve, reject) => {
        docker.listContainers({all: true}).then(rawList => {
            resolve(_trimStartingForwardSlash(rawList));
        }).catch(reject);
    });
}

const _getAllContainersName = () => {
    return new Promise(resolve => {
        _getContainers().then(containerlist => {
                resolve(containerlist.map(containerInfo => containerInfo.Names[0]));
            }
        )
    });
}

const _getContainersByName = names => {
    return new Promise((resolve, reject) => {
        const namesArray = Array.isArray(names) ? names : [names]
        docker.listContainers({'filters': {'name': namesArray}}).then(rawList => {
            resolve(_trimStartingForwardSlash(rawList));
        }).catch(reject);
    });
};

const _getAllComposerContainers = () => {
    return new Promise((resolve, reject) => {
        docker.listContainers({'filters': {'label': ["composer"]}}).then(rawList => {
            resolve(_trimStartingForwardSlash(rawList));
        }).catch(reject);
    });
}

const _trimStartingForwardSlash = rawList => {
    return rawList.map(containerInfo => {
        containerInfo.Names[0] = containerInfo.Names[0].slice(1)
        return containerInfo;
    })
};

/**
 * Get container status.
 * Param 'container' may be an id or a name
 * 
 * * @param {string} container - Id or name of the container
 * * @returns Promise
 */
const _getContainerStatus = containerName => {
    return docker.getContainer(containerName).inspect().then(info => info.State.Status).catch(
        error => {
            if(error.json.message.startsWith("No such container")) {
                return undefined;
            } else throw error;
        }
    )
}


/****************************************************
 * 
 * ACTIONS OF CONTAINERS FUNCTIONS 
 * 
 * * @param {object} parameters
 * * @returns Promise
 * 
 ****************************************************/


// LegacyName: __fnStopAllLivePreviewContainers
const _stopAllLivePreviewContainers = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('Stopping all LivePreview containers...');
        _getContainersByName(_getLivePreviewContainerNamePrefix()).then(list => {
            if ( Array.isArray(list) && list.length) {
                Promise.all(list.map(containerInfo => {
                    logger().info(`Stopping LivePreview: ${containerInfo.Names[0]}`);
                    return killContainer(containerInfo.Id).then(() => {
                        logger().info(`Stopped LivePreview: ${containerInfo.Names[0]}`)
                    });
                }))
                .then(() => resolve(parameters))
                .catch(() => reject('Error ocurred while killing containers'));
            } else {
                logger().info('No LivePreview containers found');
                resolve(parameters);
            }
        }).catch(reject);
    });
};

/**
 * Kill a container.
 * Param 'container' may be an id or a name
 * 
 * * @param {string} container - Id or name of the container
 * * @returns Promise
 */
const killContainer = container => {
    return docker.getContainer(container).kill();
};

const _killDBContainerIfLast = () => {
    logger().debug("_killDBContainerIfLast")
    return new Promise((resolve) => {
        _findRedisContainerName().then(dbContainerName => {
            _getAllComposerContainers().then(containers => {
                if(containers.length == 1 && containers[0].Names[0] == dbContainerName) {
                    logger().info(`Killing container [${dbContainerName}]`);
                    resolve(docker.getContainer(dbContainerName).remove({'force': true}));
                } else resolve();
            });
        });
    });
}

const _killAllContainers = parameters => {
    logger().debug("_killAllContainers");
    return new Promise((resolve, reject) => {
        logger().debug(`Killing all containers for ${composerConfig.composer.CELLS_TAG_VERSION}...`);

        if(composerConfig.composer.CELLSBOX_CONTAINERS.every(containerName => containerName == undefined)) {
            logger().info(`All containers are already down for ${composerConfig.composer.CELLS_TAG_VERSION}`);
            resolve(parameters);
        } else {
            let killPromises = composerConfig.composer.CELLSBOX_CONTAINERS.map(containerName => {
            if(containerName !== undefined && containerName !== _getRedisContainerName()) {
                logger().info(`Killing container [${containerName}]`);
                return docker.getContainer(containerName).remove({'force': true});
            } else return Promise.resolve();
        })
        
        Promise.all(killPromises)
        .then(_killDBContainerIfLast)
        .then(() => {
            logger().info('All containers killed');
            resolve(parameters)
        }).catch(() => reject('Error ocurred while killing containers'));
        }
    });
};

/**
 * Remove a container
 *
 * @param {string} container - Id or name of the container
 * @param {object} flags
 * @returns Promise
 */
const removeContainer = (container, flags) => {
    return docker.getContainer(container).remove(flags);
};

const _deleteFileFromContainer = (file, container) => {
    return new Promise((resolve, reject) => {
        exec(`docker exec ${container} rm -rf ${file}`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

const allUpRequired = parameters => {
    logger().debug('allUpRequired');
    try {
        return _containersStartedRequired(parameters);
    } catch (error) {
        return Promise.reject(error);
    }
}

const _containersStartedRequired = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_containersStartedRequired');

        if (!_allContainersStarted()) {
            reject('Start Composer before issuing the command. \nTo start Composer run => cells app:composer:start');
        } else {
            resolve(parameters);
        }
    });
}

const _allContainersStarted = () => {
    logger().debug('_allContainersStarted');
    return composerConfig.composer.CELLSBOX_CONTAINERS.every(containerName => containerName != undefined);
}

// LegacyName: __fnFillCellsBoxContainers
const _fillCellsBoxContainers = parameters => {
    logger().debug('_fillCellsBoxContainers');
    let promises = [_findUIContainerName(), _findApiContainerName(), _findCommandsContainerName(), _findRedisContainerName()]
    let maybeName = Promise.all(promises).then(names => {
        composerConfig.composer.CELLSBOX_CONTAINERS = names;
        return parameters;
    })
    return maybeName;
}

const _showCellBoxStatus = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_showCellBoxStatus');
        logger().info(`Composer status for version ${composerConfig.composer.CELLS_TAG_VERSION_LOWER} =>`);

        const containersStatus = _getContainerBaseNames().map(baseName => {
            let isStarted = composerConfig.composer.CELLSBOX_CONTAINERS.find(containerName => {
                return containerName != undefined && containerName.startsWith(baseName);
            }) != undefined ? 'started' : 'stopped';
            return {name: _removeVersionFromName(baseName), status: isStarted};
        });

        for (const containerStatus of containersStatus) {
            logger().info(`\tContainer[${containerStatus.name}] => ${containerStatus.status}`);
        }

        resolve(parameters);
    });
};

module.exports = {
    _getContainerInfo,
    _getContainers,
    _getAllContainers,
    _getUIContainerName,
    _getApiContainerName,
    _getRedisContainerName,
    _findRedisContainerName,
    _getCommandsContainerName,
    _getLivePreviewContainerName,
    _getLivePreviewContainerNamePrefix,
    _stopAllLivePreviewContainers,
    killContainer,
    _killAllContainers,
    _deleteFileFromContainer,
    _fillCellsBoxContainers,
    allUpRequired,
    _allContainersStarted,
    _containersStartedRequired,
    _showCellBoxStatus,
    _getContainerStatus,
    _getAllComposerContainers
}