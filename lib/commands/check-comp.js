'use strict';

const path_join = require('path').join;
const composerConfig = require('../../config/composer-config');

const { 
    _appendBowerJsonPath,
    _requireBowerJson,
    _appendBowerJsonDockerPath,
    _copyBowerJsonToDocker,
    _getCompsFromBowerJson,
    _getThemesFromBowerJson,
    _requireCompsToBeAlreadyDownloaded,
    _requireThemesToBeAlreadyDownloaded } = require('../utils/bowerUtils');

const {
    loadVars,
    informVersion,
    _appendCellsrcPath,
    _requireCellsrc,
    _appendCellsrcDockerPath,
    _requireAppLinked,
    _runDryCommand,
    startExecution,
    finishedEjecution } = require('../utils/composerUtils');

const {
    _checkComponents,
    _appendComponentType,
    _locateComponentToCheck,
    _extractCompName } = require('../utils/componentUtils');

const {
    _appendSpecsTmpDir,
    _genSpecsBasicStructure,
    _genSpecsOnComponents,
    _genSpecsOnThemes,
    _cleanSpecs,
    _packSpecs,
    _appendSpecsDockerPath,
    _copySpecsToDocker,
    _requestImportComponents,
    _removeSpecsFolder } = require('../utils/specsUtils');

const { _copyCellsrcToDocker, dockerStartup } = require('../utils/dockerUtils');
const { allUpRequired } = require('../utils/containerUtils');

const checkComp = _params => Promise.resolve(_params)
    .then(()=> { _params.component = _params.subcommands[0]; return _params })
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
    .then(_appendBowerJsonPath)
    .then(_requireBowerJson)
    .then(_params => _runDryCommand([
            'app', 'check-comp',
            (_params.component ? _params.component : ''),
        ], true)(_params))
    .then(_extractCompName)
    .then(_locateComponentToCheck)
    .then(_appendComponentType(_params))
    .then(_appendSpecsTmpDir)
    .then(_genSpecsBasicStructure)
    .then(_params => {
        switch (_params.composer.componentType) {
            case 'bower':
                return _genSpecsOnComponents(composerConfig.composer.CC_BOWER_DIR,
                    path_join(_params.composer.specsTmpDir, 'specs'),
                    [_params.composer.componentToCheck],
                    'Specs generated')(_params);
            case 'element':
                return _genSpecsOnComponents(composerConfig.composer.CC_ELEMENTS_DIR,
                    path_join(_params.composer.specsTmpDir, 'specs-elements'),
                    [_params.composer.componentToCheck],
                    'Specs generated')(_params);
            default:
                return Promise.reject(`ComponentType '${_params.composer.componentType}' unknown`);
        }
    })
    .then(_params => _cleanSpecs('specs')(_params))
    .then(_params => _cleanSpecs('specs-elements')(_params))
    .then(_packSpecs)
    .then(_appendSpecsDockerPath)
    .then(_copySpecsToDocker)
    .then(_checkComponents)
    .then(() => finishedEjecution(_params.command));

module.exports = checkComp;