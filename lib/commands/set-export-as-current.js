'use strict';

const fs_existsSync = require('fs-extra').existsSync;
const fs_readdir = require('fs').readdir;
const fs_stat = require('fs').stat;
const path_join = require('path').join;
const copydir = require('copy-dir');
const DecorateError = require('../util').DecorateError;
const logger = require('../utils/logger')['logger'];
const g = require('chalk').green;

const COMPOSER_EXPORTS_DIR = require('../../config/composer-config')['composer']['CC_COMPOSER_APP_DEFS_DIR'];
const EXPORTS_FOLDER_PATH = path_join(process.cwd(), COMPOSER_EXPORTS_DIR)
const EXPORTS_CURRENT_FOLDER_PATH = path_join(EXPORTS_FOLDER_PATH, '_current')
const BCK_CURRENT_FOLDER_PATH =  path_join(EXPORTS_CURRENT_FOLDER_PATH, '_bck')

const setExportAsCurrent = parameters => {

        const optionProvided = process.argv[3];

        if (optionProvided === '-l' || optionProvided === '--list') {

                let cwd = process.cwd();
                let dir_used = EXPORTS_FOLDER_PATH || cwd;
                 
                let getDirList = dir => {
                    dir = dir || cwd;
                    return new Promise( (resolve, reject) => {
                        fs_readdir(dir, (e, list) => {
                            if (e) {
                                reject(e.message);
                            }
                            resolve(list);
                        });
                    });
                };
                 
                let listFiles = dir => {
                    let i = 0; 
                    let len = 0;
                    let files = [];
                    dir = dir || dir_used;
                    return new Promise( (resolve, reject) => {
                        getDirList(dir).then( list => {
                         //   console.log(list);
                            let i = 0,
                            len = list.length,
                            next =  () => {
                                let file = list[i];
                                fs_stat(path_join(dir, file), (e, stat) => {
                                    if (e) {
                                        reject(e.message);
                                    }
                                    if (stat.isDirectory()) {
                                        files.push({
                                            modified:stat.mtimeMs,
                                            modifiedDate: stat.mtime,
                                            name:file
                                        });
                                    }
                                    i += 1;
                                    if (i >= len) {
                                        resolve(files);
                                    } else {
                                        next();
                                    }
                                });
                            };
                            next();
                        });
                    });
                };
                 
                listFiles(dir_used).then( list => {
                    let sortedList = list.sort(function (a, b) {
                        if (a.modified > b.modified) {
                          return 1;
                        }
                        if (a.modified < b.modified) {
                          return -1;
                        }
                        return 0;
                      });
                    let listNames = [];
                    sortedList.map(file => {
                        listNames.push("Name: "+ file.name +", Last modification: " +file.modifiedDate)
                    })
                    console.log(listNames.join('\n'));
                    process.exit(0);
                });
                 
        }
        else {
                const exportFolder = {};
                
                if (!optionProvided) {
                        logger().warn(`Parameter <Export folder> not provided. Try ${g('cells app:composer set-export-as-current -h')} for more info.`);
                        process.exit(0)
                }
        
                let folderProvided = optionProvided;
        
                exportFolder._current = path_join(EXPORTS_FOLDER_PATH, folderProvided);
        
                if (!fs_existsSync(exportFolder._current)) throw new DecorateError(`Folder ${folderProvided} not found in ${EXPORTS_FOLDER_PATH}`);
                
                if (fs_existsSync(EXPORTS_CURRENT_FOLDER_PATH)){
                        copydir(EXPORTS_CURRENT_FOLDER_PATH, BCK_CURRENT_FOLDER_PATH, err => {
                                if (err) return console.error('err')
                                logger().info('_current backup created successfully!');
                        });
                }  
                copydir(exportFolder._current, EXPORTS_CURRENT_FOLDER_PATH, err => {
                        if (err) return console.error(err)
                        logger().info('_current folder created successfully!');
                })  
        }

        return Promise.resolve(parameters);

};

module.exports = _params => Promise.resolve(_params).then(setExportAsCurrent).then(_ => _params);

