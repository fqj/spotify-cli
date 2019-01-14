
'use strict';

const { loadVars, informVersion, startExecution, finishedEjecution } = require('../utils/composerUtils');
const { _showDockerIp, dockerStartup } = require('../utils/dockerUtils');

const ip = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_showDockerIp)
        .then(_ => _params);

module.exports = ip;