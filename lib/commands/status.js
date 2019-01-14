'use strict';
peropero
const { loadVars, informVersion, startExecution, finishedEjecution } = require('../utils/composerUtils');
const { dockerStartup } = require('../utils/dockerUtils');
const { _showCellBoxStatus } = require('../utils/containerUtils');

const status = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_showCellBoxStatus)
        .then(() => finishedEjecution(_params.command));

module.exports = status;