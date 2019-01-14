'use strict';

const { _getCommandsContainerName, allUpRequired } = require('../utils/containerUtils');
const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const { _appendAppDefsPath } = require('../utils/composerUtils');
const { _exportDrafts } = require('../utils/draftUtils');
const {
        loadVars,
        informVersion,
        _appendCellsrcPath,
        _requireCellsrc,
        _appendCellsrcDockerPath,
        _runDryCommand,
        startExecution,
        finishedEjecution } = require('../utils/composerUtils');

const _export = _params => Promise.resolve(_params)
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
        .then(_params => _runDryCommand([
                'app', 'export',
                ( _params.subcommands[0] ? _params.subcommands[0] : ( _params.commandOptions._all.all ? '--all' : '' )),
            ], true)(_params))
        .then(_appendAppDefsPath)
        .then(_exportDrafts)
        .then(() => finishedEjecution(_params.command));
        
module.exports = _export;


