'use strict';

const { _getCommandsContainerName, allUpRequired } = require('../utils/containerUtils');
const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const { _detachLivePreview } = require('../utils/livePreviewUtils');
const {
        loadVars,
        informVersion,
        _appendCellsrcPath,
        _requireCellsrc,
        _appendCellsrcDockerPath,
        _forwardCommand,
        startExecution,
        finishedEjecution } = require('../utils/composerUtils');

const draft = _params => Promise.resolve(_params)
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
            'app','draft', (_params.commandOptions._all.list? '--list': ''),
            '--rc', _params.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName(), true))
        .then(() => finishedEjecution(_params.command));

module.exports = draft;