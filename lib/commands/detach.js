'use strict';

const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const { _detachLivePreview } = require('../utils/livePreviewUtils');
const { allUpRequired } = require('../utils/containerUtils');
const {
        loadVars,
        informVersion,
        _appendCellsrcPath,
        _requireCellsrc,
        _appendCellsrcDockerPath,
        _requireAppLinked,
        _appendAppId,
        startExecution,
        finishedEjecution } = require('../utils/composerUtils');

const detach = _params => Promise.resolve(_params)
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
        .then(_requireAppLinked)
        .then(_appendAppId)
        .then(_detachLivePreview)
        .then(() => finishedEjecution(_params.command));

module.exports = detach;


