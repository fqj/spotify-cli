'use strict'

const logger = require('../utils/logger').logger;
const execSync = require('child_process').execSync;
const path_join = require('path').join;
const fs_outputFileSync = require('fs-extra').outputFileSync;

const composerConfig = require('../../config/composer-config'); 
const { _adaptDockerPsOutput, isDockerRunning, dockerStartup } = require('../utils/dockerUtils');
const { loadVars, informVersion, startExecution, finishedEjecution } = require('../utils/composerUtils');

const { _buildEnvVarsArray, _getDateStringDiag } = require('../utils/utils');

const _createDiagFile = _params => {
    return new Promise((resolve, reject) => {
        logger().debug('_createDiagFile');
        try {
            const diagFile = `diag.${_getDateStringDiag()}`;
            _adaptDockerPsOutput().then(containerList => {
                fs_outputFileSync(diagFile, 
`
Date&File:              ${diagFile}

Docker
-----------------------------------------------------
Docker:                 ${execSync('docker --version').toString().trim(' ')}
Docker-Compose:         ${execSync('docker-compose --version').toString().trim(' ')}
Docker running status:  ${isDockerRunning()}

CellsBox
-----------------------------------------------------
cb:                     ${composerConfig.composer.CELLS_TAG_VERSION} - ${composerConfig.composer.CELLS_CB_ID}

Images
-----------------------------------------------------
composer_ui:            ${execSync(`docker images -q ${composerConfig.composer.ZELLS_REPO}/composer-ui:${composerConfig.composer.CELLS_TAG_VERSION}`).toString().trim(' ')}
composer_commands:      ${execSync(`docker images -q ${composerConfig.composer.ZELLS_REPO}/composer-commands:${composerConfig.composer.CELLS_TAG_VERSION}`).toString().trim(' ')}
composer_api:           ${execSync(`docker images -q ${composerConfig.composer.ZELLS_REPO}/composer-api:${composerConfig.composer.CELLS_TAG_VERSION}`).toString().trim(' ')}
composer_live_preview:  ${execSync(`docker images -q ${composerConfig.composer.ZELLS_REPO}/composer-live-preview:${composerConfig.composer.CELLS_TAG_VERSION}`).toString().trim(' ')}
composer_db:            ${execSync(`docker images -q ${composerConfig.composer.ZELLS_REPO}/composer-db:${composerConfig.composer.CELLS_TAG_VERSION}`).toString().trim(' ')}


CB - CURRENT Environment: ${composerConfig.composer.CB_ENV_ACTIVE}
-----------------------------------------------------
${_buildEnvVarsArray().join('\n')}

Running Containers:
${containerList.join('\n')}

============================================================================
============================================================================
= LOGS from dockers START ==================================================
============================================================================
============================================================================


${containerList.map(containerInfo => containerInfo.slice(0, 12)).map(containerId => {
    return `
======================================================
= DOCKER [${containerId}]
${execSync(`docker logs ${containerId}`, {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim(' ')}
======================================================
`
}).join('\n')}


============================================================================
============================================================================
= LOGS from dockers END ====================================================
============================================================================
============================================================================
`
                );
                logger().info(`diag info at => ${path_join(process.cwd(), diagFile)}`);
                resolve(_params);
            }).catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};

const diag = _params => {
    logger().debug('diag');
    return Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_createDiagFile);
};

module.exports = diag;