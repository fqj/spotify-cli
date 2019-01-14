'use strict';

const { allUpRequired, _allContainersStarted } = require('../utils/containerUtils');
const { _locateNetwork } = require('../utils/portsUtils');
const {
        loadVars,
        informVersion, 
        startExecution, 
        finishedEjecution } = require('../utils/composerUtils');

const { 
        dockerStartup,
        _expandDockerComposeYML, 
        _requireDockerComposeYML, 
        _showDockerLogs } = require('../utils/dockerUtils');

module.exports = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(allUpRequired)
        .then(cellsParams => Object.assign(_params, cellsParams))
        .then(_params =>_locateNetwork(_params, _allContainersStarted()))
        .then(_expandDockerComposeYML)
        .then(_requireDockerComposeYML)
        .then(_showDockerLogs);