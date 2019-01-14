'use strict';

const { _importDraft, _listDrafts } = require('../utils/draftUtils');
const { _getCommandsContainerName, allUpRequired } = require('../utils/containerUtils');
const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const {
        loadVars,
        informVersion,
        _appendCellsrcPath,
        _requireCellsrc,
        _appendCellsrcDockerPath,
        _runDryCommand,
        _appendAppDefsPath,
        _checkAppDefsPath,
        startExecution,
        finishedEjecution } = require('../utils/composerUtils');

const DecorateError = require('../util').DecorateError;

const _import = _params => {

    if ( _params.commandOptions._all.list ) {
        return Promise.resolve(_params)
            .then(loadVars)
            .then(informVersion)
            .then(dockerStartup)
            .then(allUpRequired)
            .then(_appendAppDefsPath)
            .then(_checkAppDefsPath)
            .then(_listDrafts);
    } else {
        _params.draftPath = _params.subcommands[0];
        if(!_params.draftPath){
            throw new DecorateError(`Non draft provided. Run 'cells app:composer:import --help' for command details.`);
        }
        return Promise.resolve(_params)
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
                    'app', 'import',
                    _params.subcommands[0],
                    _params.subcommands[1]
                ], true)(_params))
            .then(_appendAppDefsPath)
            .then(_checkAppDefsPath)
            .then(_importDraft)
            .then(() => finishedEjecution(_params.command));            
    }
};

module.exports = _import;

