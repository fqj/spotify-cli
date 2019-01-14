'use strict';

const fs = require('fs-extra');
const yaml = require('js-yaml');
const commandExistsSync = require('command-exists').sync;
const docker = require('dockerode')();
const path = require('path');
const moment = require('moment');
const sep = path.sep;
const os = require('os');
const targz = require('targz');
const crypto = require('crypto');
const split2 = require('split2');
const { logger } = require('./logger');
const { exec, execSync, spawn, spawnSync} = require('child_process');

const composerConfig = require('../../config/composer-config');
const { _fillCellsBoxContainers, _deleteFileFromContainer, _getCommandsContainerName, _getLivePreviewContainerName, _getAllContainers } = require('./containerUtils');
const { _checkFileExists, _sanitizePathToUnix } = require('./utils');

const DOCKER_COMMAND = 'docker';
const DOCKER_COMPOSE_COMMAND = 'docker-compose';


const checkIfDockerIsInstalled = () => {
    if (!commandExistsSync(DOCKER_COMMAND)) {
        throw new Error(`${DOCKER_COMMAND} not found in PATH.\nThe following programs MUST be in PATH: docker-compose, docker`);
    }
    logger().debug('Docker is installed');
};

const checkIfDockerComposeIsInstalled = () => {
    if (!commandExistsSync(DOCKER_COMPOSE_COMMAND)) {
        throw new Error(`${DOCKER_COMPOSE_COMMAND} not found in PATH.\nThe following programs MUST be in PATH: docker-compose, docker`);
    }
    logger().debug('Docker Compose is installed');
};

const isDockerRunning = () => {
    try {
        execSync('docker info', {stdio: 'ignore'});
    } catch(e) {
        logger().debug('Docker is stopped?')
        return false;
    }
    logger().debug('Docker is running!')
    return true;
}

/**
 * Throws if docker is not started.
 * @param {object} parameters - parameters passthrough.
 * @throws Will throw an error if CB_IS_DOCKER_STARTED is "false".
 * @returns parameters
 */
const requireDockerStarted = () => {
    logger().debug('requireDockerStarted');
    if (!isDockerRunning()) {
        throw new Error("Start Docker before issuing a cells composer command")
    }
};


/**
 * Sets env var CELLS_DOCKER_HOST_IP with predefined localhost ip
 */
const setDockerHostIp = parameters => {
    logger().debug('Setting Docker Host Ip to 127.0.0.1');
    if (isDockerRunning()) {
        parameters.docker.CELLS_DOCKER_HOST_IP = "127.0.0.1";
    }
};

const dockerStartup = parameters => {
    logger().debug('_dockerStartup')
    return new Promise((resolve, reject) => {
        logger().debug('Checking docker and setting docker environment variables');
        try {
            checkIfDockerIsInstalled();
            checkIfDockerComposeIsInstalled();
            setDockerHostIp(parameters);
            requireDockerStarted();
            resolve(parameters);

        } catch (error) {
            reject(error);
        }
    }).then(_fillCellsBoxContainers);
};

const _showDockerLogs = parameters => {
    parameters.selectedLog = parameters.subcommands[0];
    return new Promise((resolve, reject) => {
        logger().debug('_showDockerLogs');
        const config = composerConfig.composer.COMPOSER_LOGS_CONFIG[parameters.selectedLog];
        if ( config ) {
            const dockerComposeCommand = 'docker-compose';
            const dockerComposeParams = _composeDockerComposerCommand({
                projectName: composerConfig.composer.CELLS_TAG_VERSION,
                file: parameters.composer.dockerComposeTmpFile,
                flags: config.flags
            });
            const child = spawn(dockerComposeCommand, dockerComposeParams, {stdio: config.stdio});
            if (config.stdio === 'pipe') {
                child.stdout.pipe(split2()).on('data', data => {
                    if (data.replace(composerConfig.composer.ANSI_REPLACE_REGEXP, '').startsWith(config.filterString)) {
                        logger().info(data);
                    }
                });
                child.stderr.on('data', data => reject(data.toString()));
                child.on('error', error => reject(error));
                child.on('close', code => ( code === 0 ? resolve(parameters) : reject()));
            } else {
                resolve(parameters);
            }
        } else {
            reject(`Non valid log requested: [${parameters.selectedLog}].\nUsage: cells app:composer logs [commands|composer|db|all|all-follow]`);
            logger().warn('');

        }
    });
};

const _composeDockerComposerCommand = ({projectName, file, flags}) => {
    const commandParamsArray = ['-p', projectName, '-f', file, 'logs', ...flags];
    return commandParamsArray.filter(p => p !== '');
};

const dockerComposeUp = ({projectName, file}) => parameters => {
    // TODO: create adapter for docker-compose?
    return new Promise((resolve, reject) => {
        logger().debug('dockerComposeUp');
        try {
            spawnSync(`docker-compose -p '${projectName}' -f ${file} up -d`, [], { stdio: 'inherit', shell: true });
            resolve(parameters);
        } catch (e) {
            reject('Error occured with docker-compose up');
        }
    });
};

const dockerComposeDown = ({projectName, file}) => parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('dockerComposeDown: ' + 'projectName: ' + projectName + ' file: ' + file);
        try {
            spawnSync(`docker-compose -p '${projectName}' -f ${file} down`, [], { stdio: 'inherit', shell: true });
            resolve(parameters);
        } catch (e) {
            reject('Error occured with docker-compose down');
        }
    });
};

const dockerComposeRmi = ({projectName, file}) => parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('dockerComposeRmi');
        try {
            spawnSync(`docker-compose -p '${projectName}' -f ${file} down --rmi all`, [], { stdio: 'inherit', shell: true });
            resolve(parameters);
        } catch (e) {
            reject('Error occured with docker-compose down --rmi all');
        }
    });
};

// LegacyName: __checkOrCreateDatabaseVolume
const checkOrCreateVolume = volume => parameters => {
    return new Promise((resolve, reject) => {
        _checkDockerVolume(volume).then(() => {resolve(parameters)}).catch(() => {
            logger().debug(`Volume [${volume}] not found`);
            logger().info(`Allocating space for [${volume}] data volume...`);
            _createDockerVolume(volume)
                .then(() => {resolve(parameters)}).catch(() => {reject(`Problem creating the volume: [${volume}]. Contact with support.`)});
        })
    });
};

const _createDockerVolume = volume => {
    return new Promise((resolve, reject) => {
        logger().debug(`Creating Volume: [${volume}]`);
        docker.createVolume({ name: volume })
            .then(v => {resolve(v)})
            .catch(() => {reject(`Failed to create volume [${volume}]`)});
    });
};

const _checkDockerVolume = volume => {
    return new Promise((resolve, reject) => {
        logger().debug(`Checking Volume: [${volume}]`);
        docker.getVolume(volume).inspect()
            .then(v => {resolve(v)})
            .catch(() => {reject(`Volume [${volume}] not found`)});
    });
};

const _showDockerIp = parameters => {
    logger().debug('_showDockerIp');
    logger().info(parameters.docker.CELLS_DOCKER_HOST_IP);
    return parameters;
};

/**
 * Remove an image
 *
 * @param {string} image - Id or name of the image
 * @param {object} flags
 * @returns Promise
 */
const removeImage = (image, flags) => {
    return docker.getImage(image).remove(flags);
};

/**
 * Upload a tar archive to be extracted to a path in the filesystem of container id.
 *
 * @param {string} container - Id or name of the container
 * @param {string} file - Path to tar file to upload. Must be a tar archive compressed with one of the following algorithms: identity (no compression), gzip, bzip2, xz.
 * @param {object} path - Path to a directory in the container to extract the archive’s contents into
 * @returns Promise
 */
const putArchive = (container, file, path) => {
    const unixPath = _sanitizePathToUnix(path)
    return docker.getContainer(container).putArchive(file, {'path': unixPath});
};

const _buildEnvVarsObjectArray = () => {
    const outputComposerKeys = [];
    const outputComposerValues = [];
    for (const key in composerConfig.composer) {
        if (composerConfig.composer.hasOwnProperty(key) && composerConfig.composer.EXPOSED_CONFIG_KEYS.includes(key)) {
           // outputArray.push({name: key, value: String(composerConfig.composer[key])});
           outputComposerKeys.push(key);
           outputComposerValues.push(String(composerConfig.composer[key]));
        }
    }

    return {outputComposerKeys: outputComposerKeys, outputComposerValues: outputComposerValues};
};


// LegacyName: __copyInfoToDocker
const _copyArchiveToCommandsDocker = (origin, destination, parameters) => {
    return _putArchiveToDockerVolume(origin, destination, _getCommandsContainerName());
};
const _copyArchiveToLivePreviewDocker = (origin, destination, parameters) => {
    return _putArchiveToDockerVolume(origin, destination, _getLivePreviewContainerName(parameters.cellsProject.composer.appId));
};

const _copyArchiveFromCommandsDocker = (origin, destination) => {
    return _getArchiveFromDockerVolume(origin, destination, _getCommandsContainerName());
};

const _copyArchiveFromLivePreviewDocker = (origin, destination, parameters) => {
    return _getArchiveFromDockerVolume(origin, destination, _getLivePreviewContainerName(parameters.cellsProject.composer.appId));
};

const _copyCellsrcToDocker = parameters => {

    parameters.TMP_CELLS_TAG_VERSION = parameters.composer.CELLS_TAG_VERSION;
    return new Promise((resolve, reject) => {
        logger().debug('_copyCellsrcToDocker');
        _copyArchiveToCommandsDocker(parameters.composer.cellsrcPath, parameters.composer.cellsrcPathTmpDocker).then(() => {
            logger().debug(`App's temporal cellsrc file: ${parameters.composer.cellsrcPathTmpDocker}`);
            resolve(parameters);
        }).catch((err) => {
            reject(err);
        });
    });
};

const _putArchiveToDockerVolume = (srcFile, destFile, container) => {
    return new Promise((resolve, reject) => {
        logger().debug('_putArchiveToDockerVolume');
        const destPath = path.dirname(destFile);
        logger().debug(`Copying file ${srcFile} to path ${destPath} into container ${container}...`);
        logger().debug(`Original: \t\t${srcFile}`);
        fs.mkdtemp(`${os.tmpdir()}${sep}`, (err, tmpDirPath) => { 
            if (err) {
                reject(err);
            } else {
                logger().debug(`Temporal Folder: \t${tmpDirPath}`);
                const tmpFile = path.join(tmpDirPath, path.basename(destFile));
                fs.copy(srcFile, tmpFile, { overwrite: true, preserveTimestamps: true })
                    .then(() => {
                        logger().debug(`Temporal Copy: \t${tmpFile}`);
                        const tmpTargzFile = `${process.cwd()}.tar.gz`;
                        targz.compress({
                            src: tmpDirPath,
                            dest: tmpTargzFile
                        }, err => {
                            if (err) {
                                console.log(error)
                                process.exit(0)
                            } else {
                                putArchive(container, tmpTargzFile, destPath)
                                    .then((data) => {
                                        logger().debug('Copy done!');
                                        _deleteFileFromContainer(path.join(destPath, path.basename(tmpTargzFile)), container)
                                            .then(resolve)
                                            .catch(resolve);
                                    })
                                    .catch((err) => {
                                        reject(`${err}; Failed to copy file [${srcFile}] to docker container [${container}]`);
                                    });
                            }
                        });
                    }).catch(reject);
            }
        });
    });
};

const _expandDockerComposeYML = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_expandDockerComposeYML');

        let templateFile = yaml.safeLoad(fs.readFileSync(composerConfig.composer.CB_DOCKER_COMPOSE_YML_FILE, 'utf8'));
        let composerEnv = _buildEnvVarsObjectArray();

        const replaceProps = obj => { 
            for(var property in obj) {
                if(typeof obj[property] !== 'object' && typeof obj[property] !== 'boolean') {
                    composerEnv.outputComposerKeys.forEach(function(elem, pos) {
                        if(obj[property].includes(elem)) {
                            const replacedProp = obj[property].replace( '${'+ elem + '}' , composerEnv.outputComposerValues[pos]);
                            obj[property] = replacedProp;
                        }
                    });
                }
                if(typeof obj[property] === 'object') {
                    replaceProps(obj[property]);
                }
            }
        };

        try {
            replaceProps(templateFile);
            let templateFileYaml = yaml.safeDump (templateFile, { 'sortKeys': false });   // don't sort object keys

            fs.mkdtemp(path.join(os.tmpdir(), 'docker-compose-temp'), (err, tmpDirPath) => {
                if (err) {
                    reject(err);
                } else {
                    const outputFile = path.join(tmpDirPath, 'docker-compose.yml');
                    const buffer = new Buffer(templateFileYaml);
                    fs.open(outputFile, 'w', function(err, fd) {
                        if (err) {
                            throw 'error opening file: ' + err;
                        }
                        fs.write(fd, `${buffer}`, 0,  function(err) {
                            if (err) throw 'error writing file: ' + err;
                            fs.close(fd, function() {
                                logger().debug(`${outputFile}file written.`);
                                parameters.composer.dockerComposeTmpFile = outputFile;
                                resolve(parameters);
                            })
                        });
                    });
                }
            });

        } catch (e) {
            reject(console.log(e));
        }
    });
};

const _requireDockerComposeYML = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireDockerComposeYML');
        _checkFileExists(parameters.composer.dockerComposeTmpFile).then(() => {
            resolve(parameters);
        }).catch(() => {
            reject(`docker-compose yml ['${parameters.composer.dockerComposeTmpFile}'] NOT FOUND`);
        });
    });
};

const _expandDockerComposeRedisYML = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_expandDockerComposeRedisYML');

        let templateFile = yaml.safeLoad(fs.readFileSync(composerConfig.composer.CB_DOCKER_COMPOSE_REDIS_YML_FILE, 'utf8'));
        let composerEnv = _buildEnvVarsObjectArray();

        const replaceProps = obj => { 
            for(var property in obj) {
                if(typeof obj[property] !== 'object' && typeof obj[property] !== 'boolean') {
                    composerEnv.outputComposerKeys.forEach(function(elem, pos) {
                        if(obj[property].includes(elem)) {
                            const replacedProp = obj[property].replace( '${'+ elem + '}' , composerEnv.outputComposerValues[pos]);
                            obj[property] = replacedProp;
                        }
                    });
                }
                if(typeof obj[property] === 'object') {
                    replaceProps(obj[property]);
                }
            }
        };

        try {
            replaceProps(templateFile);
            let templateFileYaml = yaml.safeDump (templateFile, { 'sortKeys': false });   // don't sort object keys

            fs.mkdtemp(path.join(os.tmpdir(), 'docker-compose-redis-temp'), (err, tmpDirPath) => {
                if (err) {
                    reject(err);
                } else {
                    const outputFile = path.join(tmpDirPath, 'docker-compose-redis.yml');
                    const buffer = new Buffer(templateFileYaml);
                    fs.open(outputFile, 'w', function(err, fd) {
                        if (err) {
                            throw 'error opening file: ' + err;
                        }
                        fs.write(fd, `${buffer}`, 0,  function(err) {
                            if (err) throw 'error writing file: ' + err;
                            fs.close(fd, function() {
                                logger().debug(`${outputFile} file written.`);
                                parameters.composer.dockerComposeRedisTmpFile = outputFile;
                                resolve(parameters);
                            })
                        });
                    });
                }
            });
        } catch (e) {
            reject(console.log(e));
        }
    });
}

const _requireDockerComposeRedisYML = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireDockerComposeYML');
        _checkFileExists(parameters.composer.dockerComposeRedisTmpFile).then(() => {
            resolve(parameters);
        }).catch(() => {
            reject(`docker-compose-redis yml ['${parameters.composer.dockerComposeTmpFile}'] NOT FOUND`);
        });
    });
};

// LegacyName: __getTmpFileOnDocker
const _getTmpFileOnDocker = file => {
    return `${path.join(composerConfig.composer.COMMANDS_DOCKER_PATH, path.basename(_attachRandomExtension(file)))}`
};

const _getLocalesFolderOnDocker = file => {
    logger().debug('_getLocalesFolderOnDocker: ', file)

    let fileWoApp = file.replace('-app','');
    return `${path.join(composerConfig.composer.LOCALES_DOCKER_PATH, path.basename(_attachRandomExtension(fileWoApp)))}`
};

const _getStylesFolderOnDocker = file => {
    logger().debug(`_getStylesFolderOnDocker: ${path.join(composerConfig.composer.STYLES_DOCKER_PATH, path.basename(_attachRandomExtension(file)))}`)
    return `${path.join(composerConfig.composer.STYLES_DOCKER_PATH, path.basename(_attachRandomExtension(file)))}`
};

const _attachRandomExtension = (file) => {
    return `${file}.${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Copies file from a container's volume to a path in the local file system.
 *
 * For now this method is jsut a passthrough to docker command "cp", but in the future it should use Docker Remote API
 * method "getArchive", that returns a Stream object (but it seems that has multiplexed streams)?.
 *
 * @param {string} dockerFile Path to file in container's volume
 * @param {string} localPath Path where it should copy the files
 * @param {string} container Container id or name
 */
const _getArchiveFromDockerVolume = (dockerFile, localPath, container) => {
    return new Promise((resolve, reject) => {
        logger().debug('_getArchiveFromDockerVolume');
        const unixPath = _sanitizePathToUnix(dockerFile)
        const spawned = spawn(`docker cp "${container}:${unixPath}" "${localPath}"`, [], {stdio: 'inherit', shell: true});
        let error = null;
        spawned.on('error', (_error) => {
            error = _error;
            reject('Error on copy');
        });
        spawned.on('exit', (code) => {
            if ( code !== 0 || error !== null ) {
                reject('Error on copy');
            } else {
                resolve();
            }
        });
    });
};

const _adaptDockerPsOutput = () => {
    return new Promise((resolve, reject) => {
        logger().debug('_adaptDockerPsOutput');
        _getAllContainers().then(list => {
            const filteredList = list.filter(containerInfo => containerInfo.Image.includes(composerConfig.composer.CELLS_TAG_VERSION))
                .map(containerInfo => {
                    return {
                        containerId: containerInfo.Id.slice(0, 12),
                        image: containerInfo.Image,
                        command: `"${containerInfo.Command}"`,
                        created: moment(containerInfo.Created * 1000).fromNow(),
                        status: containerInfo.Status,
                        ports: containerInfo.Ports.map(portInfo => {
                            return `${portInfo.IP}:${portInfo.PublicPort}->${portInfo.PrivatePort}/${portInfo.Type}`
                        }).join(', '),
                        names: containerInfo.Names.join(', ')
                    }
                })
                .map(containerInfo => `${containerInfo.containerId}\t${containerInfo.image}\t${containerInfo.command}\t${containerInfo.created}\t${containerInfo.status}\t${containerInfo.ports}\t${containerInfo.names}`);
                resolve(filteredList);
        }).catch(reject);
    });
};

const _showDockerPs = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_showDockerPs');
        let versionWithoutDots = parameters.composer.CELLS_TAG_VERSION.toLowerCase().replace(/\./g, '');
        let shellCommand =`docker ps --filter name=${versionWithoutDots} --format "table {{.Names}}\t{{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`
        let containerNames = execSync(shellCommand, {stdio: ['ignore', 'pipe', 'ignore']});
        console.log(`${containerNames}`)
    });
};

const _copyAppDefToDocker = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_copyCellsrcToDocker');
        _copyArchiveToCommandsDocker(path.join(parameters.composer.appDefsPath, parameters.draftPath), parameters.composer.importPathTmpDocker).then(() => {
            logger().debug(`App Def copied to Docker Volume`);
            resolve(parameters);
        }).catch(error => {
            reject(error);
        });
    });
};

module.exports = {
    isDockerRunning,
    dockerStartup,
    dockerComposeUp,
    dockerComposeDown,
    dockerComposeRmi,
    checkOrCreateVolume,
    _getTmpFileOnDocker,
    _getStylesFolderOnDocker,
    _getLocalesFolderOnDocker,
    removeImage,
    _expandDockerComposeYML,
    _requireDockerComposeYML,
    _expandDockerComposeRedisYML,
    _requireDockerComposeRedisYML,
    _showDockerIp,
    _copyArchiveToCommandsDocker,
    _copyArchiveToLivePreviewDocker,
    _copyArchiveFromCommandsDocker,
    _copyArchiveFromLivePreviewDocker,
    _copyCellsrcToDocker,
    _showDockerLogs,
    _adaptDockerPsOutput,
    _showDockerPs,
    _copyAppDefToDocker
};

