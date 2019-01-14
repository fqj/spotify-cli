'use strict';

const {
        loadVars,
        informVersion, 
        startExecution, 
        finishedEjecution } = require('../utils/composerUtils');
const { dockerStartup } = require('../utils/dockerUtils');
const { _killAllContainers,
        _stopAllLivePreviewContainers } = require('../utils/containerUtils');

const kill = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_stopAllLivePreviewContainers)
        .then(_killAllContainers);

module.exports = kill;