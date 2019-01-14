'use strict';

const fs = require('fs-extra');
const path = require('path');

const { logger } = require('./logger');

const { _getCommandsContainerName } = require('./containerUtils');
const { _forwardCommand } = require('./composerUtils');
const { _copyArchiveFromCommandsDocker, _getTmpFileOnDocker, _copyAppDefToDocker } = require('./dockerUtils');
const { _getDateString } = require('./utils');

const _appendActiveDraftId = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendActiveDraftId');
        _forwardCommand([
            'app', 'draft', '--rc', parameters.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName(parameters)).then((activeDraftId) => {
            parameters.composer.activeDraftId = activeDraftId;
            logger().debug(`DraftId: [${parameters.composer.activeDraftId}]`);
            resolve(parameters);
        }).catch(reject);
    });
};

const _launchExportDraftsCommand = parameters => {
    return new Promise((resolve, reject) => {
        _forwardCommand([
            'app', 'export',
             ( parameters.draftId ? parameters.draftId : ( parameters.commandOptions._all.all ? '--all' : '' )),
             '--rc', parameters.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName(parameters), true).then(() => resolve(parameters)).catch(() => reject('Error exporting draft'));
    });
};

const _launchSplitOpCommand = action => parameters => {
    return _forwardCommand([
        'app', 'split-op', action, '--rc', parameters.composer.cellsrcPathTmpDocker
    ], _getCommandsContainerName(parameters));
};

const _ensureAppDefsPath = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('Creating exports path');
        try {
            fs.mkdirsSync(parameters.composer.appDefsPath);
            logger().debug(`Exports path created: [${parameters.composer.appDefsPath}]`);
            resolve(parameters);
        } catch (error) {
            reject(error);
        }
    });
};

const _exportDrafts = parameters => {
    let exportFolder;
    let appFolderName;
    logger().debug('_exportDrafts');
    logger().info('Exporting drafts');
    return Promise.resolve(parameters)
        .then(_launchExportDraftsCommand)
        .then(parameters => _launchSplitOpCommand('export')(parameters).catch(() => Promise.reject('Error exporting current app\'s active draft')))
        .then(_exportFolder => {
            exportFolder = _exportFolder;
            logger().debug(`Export file in Docker: ${exportFolder}`);
            return parameters;
        })
        .then(_ensureAppDefsPath)
        .then(() => _copyArchiveFromCommandsDocker(exportFolder, parameters.composer.appDefsPath).catch(() => 
            Promise.reject(`Fail copying export info from Docker folder [${exportFolder}] to [${parameters.composer.appDefsPath}]`)
        ))
        .then(() => {
            try {
                const appExportName = path.basename(exportFolder);
                appFolderName = path.join(parameters.composer.appDefsPath,`exp__${_getDateString()}__${appExportName}`);
                let appFolderNameWithoutLastDot = appFolderName.slice(0, appFolderName.lastIndexOf('.'));
                fs.renameSync(path.join(parameters.composer.appDefsPath, appExportName), appFolderNameWithoutLastDot);
                logger().info(`App exported to: [${appFolderNameWithoutLastDot}]`);
                return appFolderNameWithoutLastDot;
            } catch (error) {
                reject(error);
            }
        })
        .then(appFolderNameWithoutLastDot => {
            _checkBridgeExports(appFolderNameWithoutLastDot).catch(() => Promise.reject(`Error checking bridge exports at [${parameters.composer.appDefsPath}]`))
        })
        .then(() => parameters);
};

// LegacyName: _checkBridgeExports
const _checkBridgeExports = exportAppFolder => {
    return new Promise((resolve, reject) => {
        logger().debug('_checkBridgeExports');
        try {
            const platformsWithNoExports = [];
            fs.readdirSync(exportAppFolder)
                .forEach(draft => { 
                    fs.readdirSync(path.join(exportAppFolder, draft, 'outputs'))
                        .forEach(config => {
                            fs.readdirSync(path.join(exportAppFolder, draft, 'outputs', config, 'bridge', 'platforms'))
                                .forEach(platform => {
                                    const files = fs.readdirSync(path.join(exportAppFolder, draft, 'outputs', config, 'bridge', 'platforms', platform));
                                    // Add to "platformsWithNoExports" the platforms that have no files under them
                                    if(files.length == 0) {
                                        platformsWithNoExports.push(path.join(exportAppFolder, draft, 'outputs', config, 'bridge', 'platforms', platform));
                                    }
                                })
                        })
                });
            if (platformsWithNoExports.length) {
                logger().warn('Warning => there are no Bridge exports for the following platforms:');
                platformsWithNoExports.map(platform => {logger().warn(`\t${platform}`)});
                logger().warn('This happens when no pages are defined for those platforms');
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

const _checkDraftPathExists = parameters => {
    logger().debug(`Checking the path for draft [${parameters.draftPath}] exists`);
    return new Promise((resolve, reject) => {
        if ( fs.pathExistsSync(path.join(parameters.composer.appDefsPath, parameters.draftPath)) ) {
            logger().debug(`Path for draft exists: [${path.join(parameters.composer.appDefsPath, parameters.draftPath)}]`);
            resolve(parameters);
        } else {
            reject(`[${path.join(parameters.composer.appDefsPath, parameters.draftPath)}] is not a valid exported App folder`);
        }
    });
};

const _appendImportDockerPath = parameters => {
    logger().debug('_appendSpecsDockerPath');
    parameters.composer.importPathTmpDocker = _getTmpFileOnDocker(parameters.draftPath);
    return parameters;
};

const _launchImportDraftsCommand = parameters => {
    return new Promise((resolve, reject) => {
        _forwardCommand([
            'app', 'import', path.basename(parameters.composer.importPathTmpDocker),
            parameters.subcommands[1],
            '--rc', parameters.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName(parameters), true).then(() => resolve(parameters)).catch(() => reject('Error importing draft'));
    });
};

const _importDraft = parameters => {
    logger().debug('_importDraft');
    logger().info('Importing drafts');
    return Promise.resolve(parameters)
        .then(_checkDraftPathExists)
        .then(_appendImportDockerPath)
        .then(_copyAppDefToDocker)
        .then(_launchImportDraftsCommand)
        .then(parameters => _launchSplitOpCommand('import')(parameters).catch(() => Promise.reject('Error importing draft')))
        .then(importedAppDraft => {
            if ( !importedAppDraft.includes('No info') ) {
                logger().info(`Imported draft: [${importedAppDraft}]`);
        } else {
                logger().warn(importedAppDraft);
        }
            return parameters;
    });
};

const _listDrafts = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_listDrafts');

        if ( !fs.pathExistsSync(parameters.composer.appDefsPath) ) {
                logger().debug(`Path for draft don't exists: [${path.join(parameters.composer.appDefsPath, parameters.draftPath)}]`);
                process.exist(2)
        } 

        try {
            const exampleDefPath = fs.readdirSync(parameters.composer.appDefsPath)[0];
            let exampleDraft;
            console.log(`App Definitions available to import at: ${parameters.composer.appDefsPath}`)
            for ( const def of fs.readdirSync(parameters.composer.appDefsPath) ) {

                let drafts = fs.readdirSync(path.join(parameters.composer.appDefsPath, def));
                exampleDraft = drafts[0];
                let draftsList = '';
                for (let i=0; i<drafts.length -1; i++) {
                    draftsList += drafts[i] + ', ';
                }
                draftsList += drafts[drafts.length -1] ;
                console.log(`${def} - drafts => ${draftsList}`); 
            }
            console.log('');
            console.log('Import command => cells app:composer:import APP-DEF/DRAFT');
            console.log(`Import sample => cells app:composer:import ${exampleDefPath}/${exampleDraft}`);
            resolve(parameters);
        } catch (error) {
            console.log('Import command => cells app:composer:import APP-DEF/DRAFT');
            console.log(`Import sample => cells app:composer:import 2018_04_05_15_54_12-MY-APP.1522936453068/initial`);
            console.log(error);
            logger().debug(error);
            reject();
        }
    });
};


module.exports = { _appendActiveDraftId, _exportDrafts, _importDraft, _listDrafts}