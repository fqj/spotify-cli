'use strict';

const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const { _getCommandsContainerName, allUpRequired } = require('..//utils/containerUtils');
const {
        loadVars,
        informVersion,
        _appendCellsrcPath,
        _requireCellsrc,
        _appendCellsrcDockerPath,
        _forwardCommand,
        startExecution,
        finishedEjecution } = require('../utils/composerUtils');

const lpPort = _params => Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(allUpRequired)
        .then(_appendCellsrcPath)
        .then(_requireCellsrc)
        .then(_appendCellsrcDockerPath)
        .then(_copyCellsrcToDocker)
        .then(cellsParams => Object.assign(_params, cellsParams))
        .then(_params => _forwardCommand([
        'app', 'port',
        '--rc', _params.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName(), true))
        .then(() => finishedEjecution(_params.command));

module.exports = lpPort;


