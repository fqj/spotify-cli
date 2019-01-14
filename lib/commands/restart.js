
'use strict';

const { logger } = require('../utils/logger');

const composerConfig = require('../../config/composer-config');

const { _containersStartedRequired, _stopAllLivePreviewContainers, _allContainersStarted } = require('../utils/containerUtils');
const { 
        loadVars,
        informVersion,
        _setupNetworkParameters,
        _startPlatform,
        startExecution,
        finishedEjecution,
        _platformDown,
        _stopDbIfLast } = require('../utils/composerUtils');
        
const { _locateNetwork } = require('../utils/portsUtils');
const { 
        _expandDockerComposeYML,
        _requireDockerComposeYML,
        dockerStartup} = require('../utils/dockerUtils');

const restart = _params => Promise.resolve(_params)
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
        .then(() => _params)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_setupNetworkParameters)
        .then(_startPlatform)
        .then(() => finishedEjecution(_params.command));
  
module.exports = restart;