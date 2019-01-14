'use strict';

const logger = require('../utils/logger').logger;

const { _appendConfigs, _loadConfigs } = require('../utils/configUtils');
const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const { allUpRequired } = require('../utils/containerUtils');
const { _appendActiveDraftId } = require('../utils/draftUtils');
const {
        loadVars,
        informVersion,
        _appendCellsrcPath,
        _requireCellsrc,
        _appendCellsrcDockerPath,
        _requireAppLinked,
        startExecution,
        finishedEjecution } = require('../utils/composerUtils');

const loadConfigs = _params => Promise.resolve(_params)
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
        .then(_params => new Promise((resolve, reject) => {
            _appendActiveDraftId(_params).then(() => {
                logger().info(`Loading configs for draft: [${_params.composer.activeDraftId}]`);
                resolve(_params);
            }).catch(reject);
        }))
        .then(_appendConfigs)
        .then(_loadConfigs)
        .then(() => finishedEjecution(_params.command));

module.exports = loadConfigs;