

'use strict';

const fs_pathExistsSync = require('fs-extra').pathExistsSync;
const path_join = require('path').join;
const logger = require('../utils/logger').logger;
const composerConfig = require('../../config/composer-config');

const locales = require('./locales');
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
    _appendLocales,
    _appendConfigs,
    _loadConfigs } = require('../utils/configUtils');

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
const { _appendActiveDraftId } = require('..//utils/draftUtils');
const { _getCompsFromElements } = require('../utils/utils');


const loadComps = _params => {
    logger().debug('composerAppLoadComps');
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
            'app', 'load-comps',
            'mock-specs',
            (_params.force ? '--force' : ''),
            (_params.fcc ? `--fcc ${_params.fcc}` : '')
        ])(_params))
        .then(_requireAppLinked)
        .then(_params => new Promise((resolve, reject) => {
            _appendActiveDraftId(_params).then(() => {
                logger().info(`Loading components for draft: [${_params.composer.activeDraftId}]`);
                resolve(_params);
            }).catch(reject);
        }))
        .then(_appendBowerJsonPath)
        .then(_requireBowerJson)
        .then(_appendBowerJsonDockerPath)
        .then(_copyBowerJsonToDocker)
        .then(_getCompsFromBowerJson)
        .then(_getThemesFromBowerJson)
        .then(_requireCompsToBeAlreadyDownloaded)
        .then(_requireThemesToBeAlreadyDownloaded)
        .then(_getCompsFromElements)
        .then(_appendSpecsTmpDir)
        .then(_genSpecsBasicStructure)      
        .then(_params => _genSpecsOnComponents(composerConfig.composer.CC_BOWER_DIR,
            path_join(_params.composer.specsTmpDir, 'specs'),
            _params.composer.bowerComponents,
            'Specs Bower Components generated')(_params))
        .then(_params => {
            if ( fs_pathExistsSync(composerConfig.composer.CC_ELEMENTS_DIR) ) {
                
                return _genSpecsOnComponents(composerConfig.composer.CC_ELEMENTS_DIR,
                    path_join(_params.composer.specsTmpDir, 'specs-elements'),
                    _params.composer.elementsComponents,
                    'Specs Elements Components generated')(_params);
            } else {
                logger().debug('No elements folder found');
                return Promise.resolve(_params);
            }
        })
        .then(_genSpecsOnThemes)
        .then(_params => _cleanSpecs('specs')(_params))
        .then(_params => _cleanSpecs('specs-elements')(_params))
        .then(_packSpecs)
        .then(_appendSpecsDockerPath)
        .then(_copySpecsToDocker)
        .then(_requestImportComponents)
        .then(_params => _removeSpecsFolder(_params.composer.specsTmpDir))
        .then(() => finishedEjecution(_params.command));
};

module.exports = loadComps 


