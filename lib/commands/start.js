'use strict';

const { loadVars, informVersion, _setupNetworkParameters, _startPlatform, startExecution, finishedEjecution } = require('../utils/composerUtils');
const { dockerStartup } = require('../utils/dockerUtils');
let composerConfig = require('../../config/composer-config');

const start = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_setupNetworkParameters)
        .then(_startPlatform)
        .then(() => finishedEjecution(_params.command));

module.exports = start;