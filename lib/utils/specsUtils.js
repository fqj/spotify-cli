'use strict';

const path = require('path');
const os = require('os');
const { logger } = require('./logger');
const fs = require('fs-extra');
const targz = require('targz');

const { analyzer } = require('../analyzer');
const { generateSpecs } = require('../utils/generate-specs');

const composerConfig = require('../../config/composer-config');

const { _forwardCommand } = require('./composerUtils');
const { _getCommandsContainerName } = require('./containerUtils');
const { _getTmpFileOnDocker, _copyArchiveToCommandsDocker } = require('./dockerUtils');


const _generateSpecs = (componentsArray, componentsDir) => {
    return Promise.all(
        componentsArray.map(component => {
            logger().info(`Generating specs for [${component}]`);
            return new Promise((resolve, reject) => {
                _analyzeAndGenerateSpecs(path.join(componentsDir, component))
                    .then(() => resolve())
                    .catch(error => reject({component, error}));
            });
        })
    );
};



// SHOULD BE DONE AT THE START, on loadvars
const _appendBowerJsonPath = parameters => {
    logger().debug('_appendBowerJsonPath');
    parameters.composer.bowerJsonPath = _getBowerJsonFile();
    return parameters;
};

const _requireBowerJson = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireBowerJson');
        _checkFileExists(parameters.composer.bowerJsonPath).then(() => {
            logger().debug('bower.json File found');
            resolve(parameters)
        }).catch(() => {
            reject(`bower.json File not found: [${parameters.composer.bowerJsonPath}]`);
        });
    });
};

const _appendCellsrcDockerPath = parameters => {
    logger().debug('_appendCellsrcDockerPath');
    parameters.composer.cellsrcPathTmpDocker = _getTmpFileOnDocker(parameters.composer.cellsrcPath);
    return parameters;
};

const _appendBowerJsonDockerPath = parameters => {
    logger().debug('_appendBowerJsonDockerPath');
    parameters.composer.bowerJsonPathTmpDocker = _getTmpFileOnDocker(parameters.composer.bowerJsonPath);
    return parameters;
};

const _copyCellsrcToDocker = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_copyCellsrcToDocker');
        _copyArchiveToCommandsDocker(parameters.composer.cellsrcPath, parameters.composer.cellsrcPathTmpDocker).then(() => {
            logger().debug(`App's temporal cellsrc file: ${parameters.composer.cellsrcPathTmpDocker}`);
            resolve(parameters);
        }).catch((err) => {
            reject(err);
        });
    });
};

const _copyBowerJsonToDocker = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_copyBowerJsonToDocker');
        _copyArchiveToCommandsDocker(parameters.composer.bowerJsonPath, parameters.composer.bowerJsonPathTmpDocker).then(() => {
            logger().debug(`App's temporal bower.json file: ${parameters.composer.bowerJsonPathTmpDocker}`);
            resolve(parameters);
        }).catch((err) => {
            reject(err);
        });
    });
};

const _appendAppId = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendAppId');

        // Using Commands Functionality =>
        _forwardCommand([
            'app', 'id', '--rc', parameters.composer.cellsrcPathTmpDocker
        ], _getCommandsContainerName()).then((appId) => {
            logger().debug(`AppId: ${appId}`);
            parameters.composer.appId = appId;
            resolve(parameters);
        }).catch(reject);

        // Just scanning .cellsrc =>
        // fs.readFile(parameters.composer.cellsrcPath,'utf8', (err, data) => {
        //     if (err) {
        //         reject(err);
        //     } else {
        //         resolve(JSON.parse(data).composer.appId);
        //     }
        // })
    });
};

const _getCompsFromBowerJson = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_getCompsFromBowerJson');
        _forwardCommand([
                'app', 'load-comps',
                (parameters.force ? '--force' : ''),
                (parameters.fcc ? `--fcc ${parameters.fcc}` : ''),
            `--bower ${parameters.composer.bowerJsonPathTmpDocker}`,
            `--rc ${parameters.composer.cellsrcPathTmpDocker}`
            ], _getCommandsContainerName()
        ).then((bowerComponents) => {
            logger().debug(`Comps extracted from bower.json: ${bowerComponents}`);
            parameters.composer.bowerComponents = bowerComponents !== '' ? bowerComponents.split(' ') : [];
            resolve(parameters);
        }).catch(reject);
    });
};

const _getThemesFromBowerJson = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_getThemesFromBowerJson');
        _forwardCommand([
                'app', 'load-comps',
                (parameters.force ? '--force' : ''),
                (parameters.fcc ? `--fcc ${parameters.fcc}` : ''),
            `--bower ${parameters.composer.bowerJsonPathTmpDocker}`,
            '--styles',
            `--rc ${parameters.composer.cellsrcPathTmpDocker}`
            ], _getCommandsContainerName()
        ).then((bowerThemes) => {
            logger().debug(`Themes and icons extracted from bower.json: ${bowerThemes}`);
            parameters.composer.bowerThemes = bowerThemes !== '' ? bowerThemes.split(' ') : [];
            resolve(parameters);
        }).catch(reject);
    });
};

const _requireCompsToBeAlreadyDownloaded = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireCompsToBeAlreadyDownloaded');
            try {
            _checkComponentsExist(parameters.composer.bowerComponents);
            logger().debug('Comps already installed in \'components\' folder');
            resolve(parameters);
            } catch (e) {
                reject(e);
            }
        });
};

const _requireThemesToBeAlreadyDownloaded = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requireThemesToBeAlreadyDownloaded');
            try {
            _checkComponentsExist(parameters.composer.bowerThemes);
            logger().debug('Themes already installed in \'components\' folder');
            resolve(parameters);
            } catch (e) {
                reject(e);
            }
        });
};

const _checkComponentsExist = componentArray => {
    const bowerDir = _getBowerDir();
    componentArray.forEach(comp => {
        if ( !fs.pathExistsSync(path.join(bowerDir, comp)) ) {
            throw new Error(
                `Folder '${path.join(bowerDir, comp)}' not found.\n` +
                `Please, be sure to run 'cells app:install before trying to import components in Composer`
            );
        }
    });
};

// TODO: Test if folder is empty
const _getCompsFromElements = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_getCompsFromElements');
        const elementsDir = _getElementsDir();
        const isDirectory = path => fs.statSync(path).isDirectory();
        try {
            parameters.composer.elementsComponents = fs.readdirSync(elementsDir)
                .map(name => path.join(elementsDir, name))
                .filter(isDirectory)
                .map(dir => path.basename(dir));
            logger().debug(`Comps extracted from elements folder: ${parameters.composer.elementsComponents}`);
            resolve(parameters);
        } catch (e) {
            reject(e);
        }
    });
};

const _appendSpecsTmpDir = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_appendSpecsTmpDir');
        fs.mkdtemp(path.join(os.tmpdir(), 'specs.XXXXXXXXX'), (err, tmpDirPath) => {
            if (err) {
                reject(err);
            } else {
                parameters.composer.specsTmpDir = tmpDirPath;
                logger().debug(`Specs Tmp Folder: [${tmpDirPath}]`);
                resolve(parameters);
            }
        })
    });
};

const _genSpecsBasicStructure = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_genSpecsBasicStructure');
        const tmpDir = parameters.composer.specsTmpDir;
        logger().debug(`Generating Structure at '${tmpDir}'`);

        // Generate file structure in tmpDir
        try {

            fs.outputFileSync(path.join(tmpDir, 'custom.json'), '{"Custom": "Catalog"}\n');

            fs.copySync(parameters.composer.bowerJsonPath, path.join(tmpDir, 'bower.json'));

            fs.outputFileSync(path.join(tmpDir, 'platforms.json'), JSON.stringify([
                {platform: 'android'},
                {platform: 'ios'},
                {platform: 'desktop'}
            ], null, '\t') + '\n');

            fs.outputFileSync(path.join(tmpDir, 'families.json'), JSON.stringify([{
                name: `${composerConfig.composer.LOCAL_FAMILY}`,
                title: 'Custom/Local components',
                color: '#a690cb',
                symbol: 'Lc',
                tagline: 'CUSTOM',
                repo: 'not-used'
            }], null, '\t') + '\n');

            fs.mkdirsSync(path.join(tmpDir, 'specs'));
            fs.mkdirsSync(path.join(tmpDir, 'specs-elements'));

            logger().debug('Specs Basic Structure generated');
            resolve(parameters);
        } catch (error) {
            _removeSpecsFolder(tmpDir)(parameters)
                .then(() => reject(error))
                .catch(removalError => reject(removalError));
            }
    });
};

const _analyzeAndGenerateSpecs = appDir => {
    logger().debug('_analyzeAndGenerateSpecs');
    return Promise.resolve(appDir)
        .then(analyzer)
        .then(descriptor => Object.assign({}, { analyzer: descriptor }))
        .then(generateSpecs(appDir));
}

// LegacyName: __genSpecsOnComps
const _genSpecsOnComponents = (componentsDir, specsDir, components, successMessage) => parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_genSpecsOnComponents');
        logger().info(`Generating specs on: ${components.join(' ')}`);
        const tmpDir = parameters.composer.specsTmpDir;
        _generateSpecs(components, componentsDir).then(() => {
            _copySpecs(components, componentsDir, specsDir).then(() => {
                logger().debug(successMessage);
                resolve(parameters);
            }).catch(errObj => {
                logger().debug('Error copying Specs');
                _removeSpecsFolder(tmpDir)(parameters)
                    .then(() => reject(`Fail copying SPECS for component: ${errObj.component}`))
                    .catch(removalError => reject(removalError));
            });
        }).catch(errObj => {
            logger().debug('Error generating Specs');
            _removeSpecsFolder(tmpDir)(parameters)
                .then(() => reject(`Fail generating SPECS for component: ${errObj.component}`))
                .catch(removalError => reject(removalError));
        });
    });
};

const _copySpecs = (componentsArray, componentsDir, specsDir) => {
    return Promise.all(
        componentsArray.map(component => {
            return new Promise((resolve, reject) => {
                fs.copy(
                    path.join(componentsDir, component, 'specs.json'),
                    path.join(specsDir, `spec-${component}.json`))
                    .then(() => resolve())
                    .catch(error => reject({component, error}));
            });
        })
    );
};

// LegacyName: __genSpecsOnThemes
const _genSpecsOnThemes = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_genSpecsOnThemes');
        const tmpDir = parameters.composer.specsTmpDir;
        const [themesDir, themes] = [path.join(tmpDir, 'themes'), parameters.composer.bowerThemes];

        let theme = '';
        try {
            // Add specs folder for themes
            fs.mkdirsSync(themesDir);

            logger().info(themes);

            // May not exit if components is empty array????
            for (theme of themes) {
                // Generate specs for themes and icons consist only on touching a file with the tag of the component
                logger().debug(`Generating specs for [${theme}]`);
                fs.createFileSync(path.join(themesDir, theme));
            }

            // Marker to signal the local family name to Catalog service
            fs.createFileSync(path.join(themesDir,`${composerConfig.composer.LOCAL_FAMILY}.family`));

            // if ( Array.isArray(components) && components.length === 0) {
                // reject('NO THEMES?!?!?!?');
            // } else {
                logger().debug(`Specs Themes and Icons Components generated`);
                resolve(parameters);
            // }
        } catch (e) {
            _removeSpecsFolder(tmpDir)(parameters)
                .then(() => reject(`Fail generating SPECS for themes or icons: ${theme}`))
                .catch(removalError => reject(removalError));
            }
    });
};

/**
 * Remove the specs or specs-elements folder if is empty
 */
const _cleanSpecs = dir => parameters => {
    return new Promise((resolve, reject) => {
        logger().debug(`Cleaning [${dir}] folder if empty`);
        const specsTmpDir = path.join(parameters.composer.specsTmpDir, dir);
        try {
            if ( !(fs.readdirSync(specsTmpDir).length) ) {
                fs.removeSync(specsTmpDir);
                logger().debug(`[${dir}] deleted`);
            }
            resolve(parameters);
        } catch (e) {
            reject(e);
        }
    });
};

const _packSpecs = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_packSpecs');
        const specsTmpDir = parameters.composer.specsTmpDir;
        const compressedFile = path.join(path.dirname(specsTmpDir), composerConfig.composer.CC_SPECS_TAR_FILE);
        targz.compress({
            src: specsTmpDir,
            dest: compressedFile
        }, err => {
            if (err) {
                _removeSpecsFolder(specsTmpDir)(parameters)
                    .then(() => reject(err))
                    .catch(removalError => reject(removalError));
            } else {
                logger().debug('Specs Packed');
                parameters.composer.specsTar = compressedFile;
                resolve(parameters);
            }
        });
    });
};

const _appendSpecsDockerPath = parameters => {
    logger().debug('_appendSpecsDockerPath');
    parameters.composer.specsPathTmpDocker = _getTmpFileOnDocker(parameters.composer.specsTar);
    return parameters;
};

const _copySpecsToDocker = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_copySpecsToDocker');
        _copyArchiveToCommandsDocker(parameters.composer.specsTar, parameters.composer.specsPathTmpDocker).then(() => {
            logger().debug('Specs copied to Docker Volume');
            resolve(parameters);
        }).catch((err) => {
            reject(err);
        });
    });
};

const _requestImportComponents = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_requestImportComponents');
        logger().info(`specsFileTmpInDocker: ${parameters.composer.specsPathTmpDocker}`);
        logger().info(`specsFileBaseNameInDocker: ${path.basename(parameters.composer.specsPathTmpDocker)}`);
        
        _forwardCommand([
                'app', 'load-comps',
            path.basename(parameters.composer.specsPathTmpDocker),
                (parameters.force ? '--force' : ''),
                (parameters.fcc ? `--fcc ${parameters.fcc}` : ''),
            '--do-main',
            '--rc',
            parameters.composer.cellsrcPathTmpDocker
            ], _getCommandsContainerName()
        ).then(() => {
            logger().info('Components successfully imported');
            resolve(parameters);
        }).catch(error => {
            _removeSpecsFolder(parameters.composer.specsTmpDir)(parameters)
                .then(() => reject(error))
                .catch(removalError => reject(removalError));
        });
    });
};

const _checkComponents = parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('_checkComponents');
        _forwardCommand([
                'app', 'load-comps',
            path.basename(parameters.composer.specsPathTmpDocker),
            '--check',
            '--rc',
            parameters.composer.cellsrcPathTmpDocker
            ], _getCommandsContainerName(), true
        ).then(() => {
            logger().debug('Components checked');
            resolve(parameters);
        }).catch(error => {
            _removeSpecsFolder(parameters.composer.specsTmpDir)(parameters)
                .then(() => reject(error))
                .catch(removalError => reject(removalError));
        });
    });
};

const _removeSpecsFolder = specsTmpFolder => parameters => {
    return new Promise((resolve, reject) => {
        logger().debug('Removing Specs Tmp Folder');
        try {
            fs.removeSync(specsTmpFolder);
            logger().debug('Removed');
            resolve(parameters);
        } catch (e) {
            reject(e);
        }
    });
};

const _appendAppDefsPath = parameters => {
    logger().debug('_appendAppDefsPath');
    parameters.composer.appDefsPath = _getComposerAppDefsDir();
    return parameters;
};

module.exports = {
    _appendSpecsTmpDir,
    _genSpecsOnComponents,
    _removeSpecsFolder,
    _cleanSpecs,
    _appendSpecsDockerPath,
    _copySpecsToDocker,
    _packSpecs,
    _genSpecsOnThemes,
    _genSpecsBasicStructure,
    _requestImportComponents
}










