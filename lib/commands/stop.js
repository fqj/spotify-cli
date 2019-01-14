'use strict';

const { _containersStartedRequired, _stopAllLivePreviewContainers, _allContainersStarted } = require('../utils/containerUtils');
const { _locateNetwork } = require('../utils/portsUtils');

const { 
        dockerStartup,
        _expandDockerComposeYML, 
        _requireDockerComposeYML } = require('../utils/dockerUtils');
const {
        loadVars,
        informVersion,
        startExecution, 
        _stopDbIfLast,
        finishedEjecution,
        _platformDown } = require('../utils/composerUtils');


const stop = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_containersStartedRequired)
        .then(_params =>_locateNetwork(_params, _allContainersStarted()))
        .then(_expandDockerComposeYML)
        .then(_requireDockerComposeYML)
        .then(_stopAllLivePreviewContainers)
        .then(_platformDown)
        .then(_stopDbIfLast)
        .then(() => finishedEjecution(_params.command));

module.exports = stop;

