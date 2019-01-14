'use strict';

const ip_address = require('ip').address;
const logger = require('./logger').logger;
const fs_existsSync = require('fs-extra').existsSync;
const fs_pathExistsSync = require('fs-extra').pathExistsSync;
const path_join = require('path').join;
const { execSync, spawnSync } = require('child_process');
const request = require('request');
const dotenv_config = require('dotenv').config;
const docker = require('dockerode')();
//const docker = new Docker({socketPath: '/var/run/docker.sock'});
const DecorateError = require('../util').DecorateError;
const g = require('chalk').green;

let composerConfig = require('../../config/composer-config');
const composerDevPorts = require('../../config/composer-ports');

const { promiseSerial, _getAppResourceFile, _checkFileExists, parseJson, _getIdentity, _sanitizePathToUnix } = require('./utils');
const {
    _requireDockerComposeYML,
    _expandDockerComposeYML,
    _requireDockerComposeRedisYML,
    _expandDockerComposeRedisYML,
    dockerComposeUp,
    dockerComposeDown,
    checkOrCreateVolume,
    _getTmpFileOnDocker
} = require('./dockerUtils');
const { _setComposerPorts } = require('./portsUtils');
const {
    _fillCellsBoxContainers,
    _getCommandsContainerName,
    _findRedisContainerName,
    _getContainerStatus,
    _getAllComposerContainers
} = require('./containerUtils');


// LegacyName: __fnSetHostMachineIp
const _setHostMachineIp = parameters => {
    return new Promise((resolve) => {
        logger().debug('_setHostMachineIp');
        // const hostIP = os.networkInterfaces().en0.find(a => a.family === 'IPv4').address;
        const hostIP = ip_address();
        composerConfig.composer.COMPOSER_HOST_MACHINE_IP = hostIP;
        resolve(parameters);
    })
};

// LegacyName: _fnSetApiAddressIP
const _setApiAddressIP = parameters => {
    parameters.composer = (parameters.composer)? parameters.composer : {};
    parameters.docker = (parameters.docker)? parameters.docker :{};
    composerConfig.composer.COMPOSER_API_HOST = parameters.docker.CELLS_DOCKER_HOST_IP;
    logger().debug(`COMPOSER_API_HOST set to ${composerConfig.composer.COMPOSER_API_HOST}`);
    return parameters;
};

const _setupNetworkParameters = parameters => {
    logger().debug('_setupNetworkParameters');
    return Promise.resolve(parameters)
        .then(_setApiAddressIP)
        .then(_setComposerPorts)
        .then(_setHostMachineIp)
        .then(_ => parameters);
};

const _checkRecentVersions = config => {

    let cellSrcVersion = null;
    let versionFound =  false;
    if (!cellSrcVersion){
        cellSrcVersion = config.composer.CELLS_TAG_VERSION;
    }

    return new Promise((resolve, reject) => {

        function resolveVersion() {
            resolve(config);
        }

        function progress() {
            logger().debug('no special version found.');
        }

        function dealWithSpecialVersions(option) {
            const options = {
                '0.0.0develop': resolveVersion,
                '0.0.0feature': resolveVersion,
                '0.0.0release': resolveVersion,
                '0.0.0master': resolveVersion,
                'default': progress,
            }
            return (options[option] || options['default'])(); 
        }

        dealWithSpecialVersions(cellSrcVersion.toLowerCase())

        // Check if the passed version begins on ^
        if (cellSrcVersion.substring(0,1) === '^') {
            // Composer version with '^'

            function getVersionsOfImages(i) {
                return i.slice(i.lastIndexOf(':')+1);
            } 

            function getMinumVersionOfVersionsOfImages(i) {
                return parseInt(i.slice(1).replace(/\./g, ''));
            }

            function getNum(i) {
                return parseInt(i.replace(/\./g, ''));
            }

            let currentSemverVersion = cellSrcVersion.slice(1);
            let semverMaxVersion = cellSrcVersion.slice(1).slice(0,2);

            function getContainers(version) {
                return new Promise( resolve => {
                    docker.listContainers((err, containers) => {
                        if (err) {
                            console.log(err);
                            process.exit(0)
                        }
                        resolve(containers.filter(containerInfo => containerInfo.Image.indexOf(version) !== -1 ));
                    })
                })
            }

            async function similarContainers(version) {
                let containers = await getContainers(version);
                let images = containers.map(container => container.Image);
                return images;
            }


            similarContainers(semverMaxVersion).then( images => {
                if (images.length > 0) {
                    let versionStarted2 = images.map(getVersionsOfImages);
                    let versionStarted3 = versionStarted2.slice(0,versionStarted2.length -1).concat(currentSemverVersion);
                    let versionStartedNum = versionStarted3.map(getMinumVersionOfVersionsOfImages);
                    let max = Math.max(...versionStartedNum);
                    let posOfMaxVersion = versionStartedNum.indexOf(max);
                    let maxSemverVersionStarted = versionStarted3[posOfMaxVersion]

                    if(!versionFound && maxSemverVersionStarted !== currentSemverVersion) {
                            versionFound = true;
                            config.composer.CELLS_TAG_VERSION = maxSemverVersionStarted;
                            resolve(config);
                    }

                   if(!versionFound && max  === getMinumVersionOfVersionsOfImages(currentSemverVersion)) {

                        similarContainers(currentSemverVersion).then(images => {
                            if (images > 0){
                                versionFound = true;
                                config.composer.CELLS_TAG_VERSION = currentSemverVersion;
                                resolve(config);
                            }
                            else {
                                module.exports._request(config.composer.COMPOSER_VERSIONS_URL, (err, res, body) => {
                                    let data;
                                    try {
                                        data = JSON.parse(body);
                                    } catch(e) {
                                        reject(e)
                                    }
                    
                                    if (err) {
                                        reject(err);
                                    } else if (data.versions instanceof Array) {
                                        // Take the version without ^
                                        const version = currentSemverVersion;
                                        const versionsArray = data.versions;
                                        const posCurrentVersion = versionsArray.indexOf(version);
                    
                                        // Check if the version exists in the array
                                        if (posCurrentVersion !== -1) {
                                            const currentVersion = versionsArray[posCurrentVersion];
                                            config.composer.CELLS_TAG_VERSION = currentVersion;
                                            resolve(config);
                                        }
                                        else {
                                            reject(`The provided version ${version} doesn't exists as an available Composer version. Please check your .cellsrc file.`);
                                        }
                                    } else {
                                        reject(`The provided version ${version} doesn't exists as an available Composer version. Please check your .cellsrc file.`);
                                    }
                                });
                            }
                        })
                   } else if(!versionFound) {
                    module.exports._request(config.composer.COMPOSER_VERSIONS_URL, (err, res, body) => {
                        let data;
        
                        try {
                            data = JSON.parse(body);
                        } catch(e) {
                            reject(e)
                        }
                        
                        if (err) {
                            reject(err);
                        } else if (data.versions instanceof Array) {
                            // Take the version without ^
                            const version = cellSrcVersion.substring(1);
                            const versionStart =  cellSrcVersion.substring(1).slice(0,2)
                            function sameVersion(i) {
                                return i.startsWith(versionStart)
                            }
    
                            let sameVersionsArray = data.versions.filter(sameVersion);
    
                            if(sameVersionsArray.length === 0) {
                                reject(`The provided version [${version}] doesn't exists as an available Composer version. Please check your .cellsrc file.`);
                            }
    
                            let sameVersionArrayNum = sameVersionsArray.map(getNum);
                            let maxVersion = Math.max(...sameVersionArrayNum);
                            let posMaxVersion = sameVersionArrayNum.indexOf(maxVersion);
    
                            let versionSelected = sameVersionsArray[posMaxVersion]
    
                            config.composer.CELLS_TAG_VERSION = versionSelected;
                            resolve(config);
    
                            if (!~data.versions.indexOf(version)) {
                                reject(`The provided version [${version}] doesn't exists as an available Composer version. Please check your .cellsrc file.`);
                            }
    
                            const [rMayor, rMinor, rPatch] = version.split('.')
                            const fVer = data.versions.reduce((sVer, cVer) => {
                                const [mayor, minor, patch] = cVer.split('.');
        
                                if (mayor === rMayor &&
                                    (minor > rMinor ||
                                        (minor === rMinor && patch > rPatch))) {
                                    return cVer;
                                }
        
                                return sVer;
                            }, version);
        
                            config.composer.CELLS_TAG_VERSION = fVer;
                            resolve(config);
                        } else {
                            reject('Composer versions must be an array.');
                        }
                    });
                   }
                }
                else {
 
                    module.exports._request(config.composer.COMPOSER_VERSIONS_URL, (err, res, body) => {
                        
                        let data;
        
                        try {
                            data = JSON.parse(body);
                        } catch(e) {
                            reject(e)
                        }
        
                        if (err) {
                            reject(err);
                        } else if (data.versions instanceof Array) {
                            // Take the version without ^
                            const version = cellSrcVersion;
                            const versionWithoutCaret = cellSrcVersion.substring(1);
                            const versionStart =  versionWithoutCaret.slice(0,2)

                            function sameVersion(i) {
                                return i.startsWith(versionStart)
                            }
    
                            let sameVersionsArray = data.versions.filter(sameVersion);

                            if(!versionFound && sameVersionsArray.length === 0) {
                                reject(`The provided version [${version}] doesn't exists as an available Composer version. Please check your .cellsrc file.`);
                            }

                            if(!versionFound) {
                                let sameVersionArrayNum = sameVersionsArray.concat(versionWithoutCaret).map(getNum);
                                let maxVersion = Math.max(...sameVersionArrayNum);
                                let posMaxVersion = sameVersionArrayNum.indexOf(maxVersion);
                                let versionSelected = sameVersionsArray[posMaxVersion];
                                if(versionSelected === undefined) {
                                    reject(`No compatible version was found for [${version}]. Please check your .cellsrc file.`);
                                }
                                else {
                                    config.composer.CELLS_TAG_VERSION = versionSelected;
                                    resolve(config);
                                }
                            }

                        } else {
                            reject("Don't exists this Composer version in the array.");
                        }
                    });
                }
            })

        } else {
            // Composer version without '^'
            module.exports._request(config.composer.COMPOSER_VERSIONS_URL, (err, res, body) => {
        
                let data;

                try {
                    data = JSON.parse(body);
                } catch(e) {
                    reject(e)
                }

                if (err) {
                    reject(err);
                } else if (data.versions instanceof Array) {
                    // Take the version without ^
                    const version = cellSrcVersion;
                    const versionsArray = data.versions;
                    const posCurrentVersion = versionsArray.indexOf(version);

                    // Check if the version exists in the array
                    if (posCurrentVersion !== -1) {
                        const currentVersion = versionsArray[posCurrentVersion];
                        config.composer.CELLS_TAG_VERSION = currentVersion;
                        resolve(config);
                    }
                    else {
                        reject(`The provided version [${version}] doesn't exists as an available Composer version. Please check your .cellsrc file.`);
                    }
                } else {
                    reject('Composer versions must be an array.');
                }
            });
        }
    });
};

const _checkAppDefsPath = parameters => {
    logger().debug('Checking exports path');

    return new Promise((resolve, reject) => {
        if ( fs_pathExistsSync(parameters.composer.appDefsPath) ) {
            logger().debug(`Exports path exists: [${parameters.composer.appDefsPath}]`);
            resolve(parameters);
        } else {
            logger().warn(`Path ${parameters.composer.appDefsPath} does not exist. Try exporting a draft first: ${g('cells composer app export')}`)
            reject('');
        }
    });
};

// LegacyName: platformStart
const _startPlatform = parameters => {
    logger().debug('_startPlatform');
    return Promise.resolve(parameters)
        .then(checkOrCreateVolume(composerConfig.composer.CELLS_BOX_DB))
        .then(checkOrCreateVolume(composerConfig.composer.CELLS_BOX_API))
        .then(_startDBIfStopped)
        .then(_expandDockerComposeYML)
        .then(_requireDockerComposeYML)
        .then(_platformUp)
        .then(_fillCellsBoxContainers)
        .then(_awaitServicesUpOrTimeout(composerConfig.composer.MAX_WAITUP_TIME));
};

const _platformUp = parameters => {
    return dockerComposeUp({projectName: composerConfig.composer.CELLS_TAG_VERSION, file: parameters.composer.dockerComposeTmpFile})(parameters);
}

const _platformDown = parameters => {
    return dockerComposeDown({projectName: parameters.composer.CELLS_TAG_VERSION, file: parameters.composer.dockerComposeTmpFile})(parameters)
}

const _startDBIfStopped = parameters => {
    logger().debug('_startDBIfStopped');
    return new Promise((resolve) => {
        _isDbRunning().then(isDbRunning => {
            if(!isDbRunning) {
                logger().debug('Starting database');
                _expandDockerComposeRedisYML(parameters)
                .then(_requireDockerComposeRedisYML)
                .then(_dbUp)
                .then(() => resolve(parameters));
            } else {
                logger().debug('Database is already running');
                resolve(parameters)
            }
        });
    });
};

const _dbUp = parameters => {
    dockerComposeUp({projectName: "composer", file: parameters.composer.dockerComposeRedisTmpFile})(parameters);
}


const _isDbRunning = () => {
    logger().debug('_isDbRunning');
    return new Promise((resolve) => {
        _findRedisContainerName().then(_getContainerStatus).then(dbStatus => {
            resolve(dbStatus != undefined && dbStatus == "running")
        });
    });
}

const _stopDbIfLast = parameters => {
    logger().debug("_stopDbIfLast")
    return new Promise((resolve) => {
        _findRedisContainerName().then(dbContainerName => {
            _getAllComposerContainers().then(containers => {
                if(containers.length == 1 && containers[0].Names[0] == dbContainerName) {
                    resolve(_stopDB(parameters))
                } else resolve(parameters)
            });
        });
        
    });
}

const _stopDB = parameters => {
    logger().debug("_stopDB")
    return new Promise(resolve => {
        logger().info('Stopping database...');
        _expandDockerComposeRedisYML(parameters)
            .then(_requireDockerComposeRedisYML)
            .then(parameters => dockerComposeDown({projectName: "composer", file: parameters.composer.dockerComposeRedisTmpFile})(parameters))
            .then(resolve)
    })
}

// Precedence: process.env (environment vars) > ~/.cb/envs/.env > composer-config.js
// FIXME: Rename to loadConfig
const loadVars = parameters => {
    logger().debug('loadVars');
    return _loadConfig(parameters);
};

const _loadConfig = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_loadConfig');
        _loadProfile(composerConfig.composer.DEFAULT_PROFILES_PATH);

        // Initialize composer object
        parameters.composer = {};
        parameters.docker = {};

        composerConfig = parameters.composerConfig || composerConfig;

        _loadCellsrc(parameters)
            .then(() => {
                if (parameters.composerVersion) {
                    composerConfig.composer.CELLS_TAG_VERSION = parameters.composerVersion;
                } else if (parameters.cellsProject && parameters.cellsProject.composer && parameters.cellsProject.composer.version) {
                    composerConfig.composer.CELLS_TAG_VERSION = parameters.cellsProject.composer.version;
                }

                _setUpRemainingConfigs((composerConfig))
                    .then(config => {
                        resolve(config);
                    })
                    .catch(reject);
            })
    });
};

const _loadCellsrc = parameters => {
    return new Promise(resolve => {
        _appendCellsrcPath(parameters);
        _requireCellsrc(parameters)
            .then(() => {
                parameters.cellsProject = parseJson(parameters.composer.cellsrcPath);
                resolve(parameters);

            })
            .catch(err => {
                logger().error(err);
                resolve(parameters)
            })
    });
}

const _appendCellsrcPath = parameters => {
    logger().debug('_appendCellsrcPath');
    parameters.composer.cellsrcPath = _getAppResourceFile();
    if (!fs_existsSync(parameters.composer.cellsrcPath)) {
        logger().warn(`.cellsrc file not found. Are you in an app root folder?\nTry ${g("cells app:composer:home")} to find the app root folder.`);
        process.exit(0);
    }
    parameters.cellsProject = parseJson(parameters.composer.cellsrcPath);
    return parameters;
};

const _requireCellsrc = parameters => {

    return new Promise((resolve, reject) => {
        logger().debug('_requireCellsrc');
        logger().debug(parameters.composer.cellsrcPath);
        _checkFileExists(parameters.composer.cellsrcPath).then(() => {
            logger().debug('App Resources File found');
            resolve(parameters)
        }).catch(() => {
            reject(`.cellsrc file not found: [${parameters.composer.cellsrcPath}]\nTry ${g('cells app:composer home')} to find the closest application root folder.`);
        });
    });
};

const _appendCellsrcDockerPath = parameters => {
    logger().debug('_appendCellsrcDockerPath');
    parameters.composer.cellsrcPathTmpDocker = _getTmpFileOnDocker(parameters.composer.cellsrcPath);
    return parameters;
};

const _loadProfile = path => {
    const result = dotenv_config({path});
    if (result.error) {
        logger().debug(`Profile file (.env) file not found at: ${composerConfig.composer.DEFAULT_PROFILES_PATH}`);
    }
};

const _setUpRemainingConfigs = config => {

    return _checkRecentVersions(config)
        .then(config => {
            config.composer.CELLS_TAG_VERSION_LOWER = config.composer.CELLS_TAG_VERSION.toLowerCase();
            config.composer.LIVE_PREVIEW_DOCKER = `${config.composer.ZELLS_REPO}/composer-live-preview:${config.composer.CELLS_TAG_VERSION}`;
            return config;
        });
};

// LegacyName: _fnAwaitServicesUpOrTimeout
const _awaitServicesUpOrTimeout = (time) => parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_awaitServicesUpOrTimeout');
        process.stdout.write('Waiting to setup.');
        const interval = setInterval(() => {
            _forwardCommand(['api', 'ping'], _getCommandsContainerName())
                .then(() => {
                    process.stdout.write(' Ready\n');
                    clearInterval(interval);
                    clearTimeout(timeoutInterval);
                    resolve(parameters);
                })
                .catch((e) => {
                    process.stdout.write('.')
                });
        }, 1000);

        const timeoutInterval = setTimeout(() => {
            clearInterval(interval);
            process.stdout.write('\n');
            reject('Fail to start Composer');
        }, time * 1000);
    });
};

const _forwardCommand = (commandArray, container, writeToStdout = false) => {
    return new Promise((resolve, reject) => {

        const sanitizedCommands = commandArray.map(command => _sanitizePathToUnix(command))

        logger().debug(`Executing: 'cr ${sanitizedCommands.join(' ')} ${_getIdentity()}' on container ${container}`);
        if (!container) {
            reject(`Must define a container to execute to`);
        } else {
            const shellCommand = `docker exec ${container.toLowerCase()} cr ${sanitizedCommands.filter(_ => _ !== '').join(' ')} ${_getIdentity()}`;

            if ( writeToStdout === true ) {
                try {
                    spawnSync(shellCommand, [], {stdio: 'inherit', shell: true});
                    resolve();
                } catch (e) {
                    reject(e);
                }
            } else {
                try {
                    resolve(execSync(shellCommand, {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim());
                } catch (e) {
                    reject(e);
                }
            }
        }
    });
};

const _requireAppLinked = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireAppLinked');
        _forwardCommand([
            'app', 'link --status', '--rc', parameters.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName(), false)
        .then((data) => {
            logger().debug('Performed app linked check');
            resolve(parameters);
        }).catch((err) => {
            logger().error('App is not linked, execute \'cells composer:app:link\' from app folder');
            reject('App is not linked, execute \'cells composer:app:link\' from app folder');
        });
    });
};

const _appendAppId = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendAppId');
        _forwardCommand([
            'app', 'id', '--rc', parameters.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName()).then((appId) => {
            logger().debug(`AppId: ${appId}`);
            parameters.composer.appId = appId;
            resolve(parameters);
        }).catch(reject);
    });
};

const _checkAppStatus = parameters => {
    let status = parameters.subcommands[0];
    status = status? status : parameters.commandOptions._all.status ? '--status' : '';

    return new Promise((resolve, reject) => {
        logger().debug('_checkAppStatus');
        _forwardCommand(
            [ 
                'app', 
                'link',
                status,
                '--rc',
                parameters.composer.cellsrcPathTmpDocker

            ], _getCommandsContainerName(), true)
                .then(() => {
                    resolve(parameters);
                })
                .catch(err => {
                    reject(err);
                });
            });
}

const _runDryCommand = (forwardCommandArgs, writeToStdout = false) => parameters => {
    return new Promise((resolve, reject) => {

        logger().debug('_runDryCommand');
        _forwardCommand([
                ...forwardCommandArgs,
                '--run-dry',
                '--rc',
                parameters.composer.cellsrcPathTmpDocker
            ], _getCommandsContainerName(), writeToStdout
        ).then(() => {
            logger().debug('run-dry performed, everything is ok in the command line');
            resolve(parameters);
        }).catch(reject);
    });
};


const _getComposerAppDefsDir = () => {
    return path_join(process.cwd(), composerConfig.composer.CC_COMPOSER_APP_DEFS_DIR);
  };

const _appendAppDefsPath = parameters => {
    logger().debug('_appendAppDefsPath');
    parameters.composer.appDefsPath = _getComposerAppDefsDir();
    return parameters;
};
const startExecution = _params => {
    console.log(`\u25CE Starting ${g(_params.command)} command in Docker Enviroment`);
    return _params;
}

const informVersion = _params => {
    console.log(`\u25CE Executing in Composer ${g(composerConfig.composer.CELLS_TAG_VERSION_LOWER)}`);
    return _params;
}

const finishedEjecution = command => console.log(`\u25C9 The ${g(command.replace('-',':'))} command finished succesfully`);

module.exports = {
    _setHostMachineIp,
    _setupNetworkParameters,
    _startPlatform,
    _checkAppDefsPath,
    _request: request,
    loadVars,
    _forwardCommand,
    _appendCellsrcPath,
    _requireCellsrc,
    _appendCellsrcDockerPath,
    _requireAppLinked,
    _appendAppId,
    _checkAppStatus,
    _runDryCommand,
    _appendAppDefsPath,
    startExecution,
    informVersion,
    _stopDbIfLast,
    finishedEjecution,
    _platformDown
};
