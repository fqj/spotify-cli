
'use strict';

const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const { allUpRequired, _getCommandsContainerName } = require('../utils/containerUtils');
const {
        loadVars,
        informVersion,
        _appendCellsrcPath,
        _requireCellsrc,
        _appendCellsrcDockerPath,
        _requireAppLinked,
        _appendAppId,
        _checkAppStatus,
        _forwardCommand,
        startExecution,
        finishedEjecution } = require('../utils/composerUtils');
const { _launchComposerUi } = require('../utils/browserUtils');
const appSass = require('./sass')

const ui = _params => {
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
      .then(_requireAppLinked) 
      .then(cellsParams => Object.assign(_params, cellsParams))
      .then(_params => _forwardCommand([
        'app','draft', (_params.commandOptions._all.list? '--list': ''),
        '--rc', _params.composer.cellsrcPathTmpDocker
    ], _getCommandsContainerName(), false))
      .then( draft => {
        _params.cellsProject.composer.activeDraft = draft;
        return Promise.resolve(_params)
        .then(_launchComposerUi);
      });
};

module.exports = ui;

