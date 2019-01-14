'use strict';

const { loadVars, informVersion, startExecution, finishedEjecution } = require('../utils/composerUtils');
const { allUpRequired, _allContainersStarted } = require('../utils/containerUtils');
const { dockerStartup } = require('../utils/dockerUtils');
const { _locateNetwork, _showPorts } = require('../utils/portsUtils');

module.exports = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(allUpRequired)
        .then(_params =>_locateNetwork(_params, _allContainersStarted()))
        .then(_showPorts);