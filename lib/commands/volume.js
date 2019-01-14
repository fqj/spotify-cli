'use strict';

const fs_existsSync = require('fs-extra').existsSync;
const fs_writeJsonSync = require('fs-extra').writeJsonSync;
const fs = require('fs')
const path_join = require('path').join;
const path = require('path')
const copydir = require('copy-dir');
const logger = require('../utils/logger')['logger'];
const g = require('chalk').green;
const DecorateError = require('../util').DecorateError;

const SOURCE_DEV_CURRENT = 'composer/exports/_current/initial/outputs';
const JSON_DEF_PATH = 'bridge/platforms/webapp'
const SOURCE_DEV_EXP = 'composer/exports';
const OUTPUTS_PATH ='initial/outputs'
const TARGET_DEV = 'app/composerMocksTpl';
const TARGET_VENDOR = 'app/vendor';
const TARGET_REMOTE_TEMPLATES_FILE = 'remoteTemplates.json';
const TARGET_DEV_APP_PATH = path_join(process.cwd(), TARGET_DEV);
const TARGET_VENDOR_PATH = path_join(process.cwd(), TARGET_VENDOR);
const SOURCE_DEV_APP_PATH = path_join(process.cwd(), SOURCE_DEV_CURRENT);
const SOURCE_DEV_EXP_APP_PATH = path_join(process.cwd(), SOURCE_DEV_EXP);

const optionList = ['-l', '--list', '--source', '-s'];

const copyJSONs = dir => {
        logger().debug("copyJSONs")
        copydir(dir, TARGET_DEV_APP_PATH, err => {
                if (err) return console.error('err')
                logger().info(`App JSON copied successfully in '${TARGET_DEV_APP_PATH}'.`);
        });
}

const copyEngine = dir => {
        copydir(dir, TARGET_VENDOR_PATH, (fstat, filepath, filename) => {
                if(filepath.includes('engine')) {
                        return true;
                } else {
                        return false;
                }
        }, err => {
                if (err) return console.error('err')
                logger().info(`Engine definition copied successfully to '${TARGET_VENDOR_PATH}'.`)
        });
}

const createRemoteTemplatesFile = dir => {
        logger().debug("createRemoteTemplatesFile");
        var re = /(?:\.([^.]+))?$/;

        const remoteTemplates = [];
        fs.readdirSync(dir).filter(filename => filename.endsWith(".json")).map(filename => {
                let splitted = filename.split(".")
                splitted.pop();
                remoteTemplates.push(splitted.join("."));
        });

        fs_writeJsonSync(path_join(TARGET_VENDOR_PATH, "engine", TARGET_REMOTE_TEMPLATES_FILE), remoteTemplates);
        logger().info(`Remote templates written successfully to '${path_join(TARGET_VENDOR_PATH, "engine")}'`);
}

const copyDefinitionFiles = dir => {
        logger().debug("copyDefinitionFiles")
        const JSONdir = path_join(dir, JSON_DEF_PATH);

        copyJSONs(JSONdir);
        copyEngine(dir);
        createRemoteTemplatesFile(JSONdir);
}

const setCurrent = parameters => {

        const args = process.argv;


        if (args.length === 3) {
                let sourceDevEngineAppPath = path_join(SOURCE_DEV_APP_PATH, 'no-config');

                if (!fs_existsSync(sourceDevEngineAppPath)) {
                        logger().warn(`Folder 'no-config' not found in ${SOURCE_DEV_CURRENT}. For command information, run "cells app:composer:set-as-mocks -h"`);
                        process.exit(2);
                }

                let sourceJsonDefPath = path_join(sourceDevEngineAppPath, JSON_DEF_PATH);

                if (!fs_existsSync(sourceJsonDefPath)) {
                        logger().warn(`Folder 'bridge/platforms/webapp' not found in ${sourceDevEngineAppPath}. For command information, run "cells app:composer:set-as-mocks -h"`);
                        process.exit(2);
                }

                copyDefinitionFiles(sourceDevEngineAppPath)
        }
        if(args.length === 4) {

                if (process.argv[3] === '-l' || process.argv[3] === '--list') {
                        if (!fs_existsSync(SOURCE_DEV_CURRENT)) {
                                logger().warn(`Folder ${SOURCE_DEV_CURRENT} not found. For command information, run "cells app:composer:set-as-mocks -h"`);
                                process.exit(2);
                        }
                        let filesFound = fs.readdirSync(SOURCE_DEV_CURRENT).filter(filename => filename !== '.DS_Store');
                        if (filesFound.length === 0) {
                                console.log(`No files found in ${SOURCE_DEV_CURRENT}`);
                                process.exit(2)
                        }
                        filesFound.forEach(filename => {
                                console.log(filename);
                        }); 
                        process.exit(0);
                }

                if(process.argv[3] !== '--source' && process.argv[3] !== '-s' ) {
                   
                        let folderConfig = process.argv[3];
                        let sourceExportFolder = path_join(SOURCE_DEV_CURRENT, folderConfig);

                        if (!fs_existsSync(sourceExportFolder)) {
                                logger().warn(`Folder ${sourceExportFolder} not found in ${SOURCE_DEV_EXP}. For command information, try ${g("cells app:composer:set-as-mocks -h")}`);
                                process.exit(2);
                        }

                        let sourceJsonDefPath = path_join(sourceExportFolder, JSON_DEF_PATH);


                        if (!fs_existsSync(sourceJsonDefPath)) {
                                logger().warn(`Folder ${JSON_DEF_PATH} not found in ${sourceJsonOutputsPath}. For command information, run "cells app:composer:set-as-mocks -h"`);
                                process.exit(2);
                        }

                        console.log(sourceExportFolder)

                        copyDefinitionFiles(sourceExportFolder)
                }

                if (process.argv[3] === '-s' || process.argv[3] === '--source') {

                        if(process.argv[4] === undefined) {
                                logger().warn(
                                        `Source folder not provided. For command information, run "cells app:composer:set-as-mocks -h".`
                                );      
                                process.exit(1)
                        }
                        
                }
                
        }
        if(args.length === 5) {

                const SOURCE_DEV_CURRENT = 'initial/outputs';
                const JSON_DEF_PATH = 'bridge/platforms/webapp'
               
                if (process.argv[3] === '-l' || process.argv[3] === '--list') {
                        let folder = path_join(SOURCE_DEV_EXP_APP_PATH, process.argv[4]);
                        console.log('folder: ', folder)
                        if (!fs_existsSync(folder)) {
                                logger().warn(`Folder ${process.argv[4]} not found in ${SOURCE_DEV_EXP_APP_PATH}. For command information, run "cells app:composer:set-as-mocks -h"`);
                                process.exit(2);
                        }
                        fs.readdirSync(folder).filter(filename => filename !== '.DS_Store').forEach(filename => console.log(filename)); 
                        process.exit(0);
                }

                if (process.argv[3] !== '-s' && process.argv[3] !== '--source') {
                        logger().warn(
                        `Something was wrong. For command information, run "cells app:composer:set-as-mocks -h".`
                        );      
                        process.exit(1)
                }
                let sourceDevEngineAppPath = path_join(SOURCE_DEV_EXP, process.argv[4], SOURCE_DEV_CURRENT, "no-config");
                if (!fs_existsSync(sourceDevEngineAppPath)) {
                        logger().warn(`Folder ${process.argv[4]} not found in ${SOURCE_DEV_EXP_APP_PATH}. For command information, run "cells app:composer:set-as-mocks -h"`);
                        process.exit(2);
                }

                copyDefinitionFiles(sourceDevEngineAppPath)
        }

}; 

module.exports = _params => Promise.resolve(_params).then(setCurrent).then(_ => _params);