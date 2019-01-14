'use strict';

const logger = require('../utils/logger').logger;

const appSass = require('./sass');
const { _appendStyles, _loadStyles } = require('../utils/configUtils');
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

const loadStyles = _params => Promise.resolve(_params)
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
                logger().info(`Loading styles for draft: [${_params.composer.activeDraftId}]`);
                resolve(_params);
            }).catch(reject);
        }))
        .then(appSass)
        .then(_appendStyles)
        .then(() => finishedEjecution(_params.command));

module.exports = loadStyles;