'use strict';

const { logger } = require('../utils/logger');
const composerConfig = require('../../config/composer-config');
const { loadVars, informVersion, startExecution, finishedEjecution } = require('../utils/composerUtils');
const { dockerStartup } = require('../utils/dockerUtils');
const { _locateNetwork, _showPorts } = require('../utils/portsUtils');
const { _buildEnvVarsArray } = require('../utils/utils');
const { _allContainersStarted } = require('../utils/containerUtils');

const env = _params => Promise.resolve(_params)
    .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_params =>_locateNetwork(_params, _allContainersStarted()))
        .then(_params => {
            logger().info(`Composer - CURRENT Environment: ${composerConfig.composer.CB_ENV_ACTIVE}`);
            logger().info('-----------------------------------------------------');
            _buildEnvVarsArray().forEach(env => logger().info(env));
            return _params;
        });

module.exports = env;