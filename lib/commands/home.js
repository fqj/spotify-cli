'use strict';

const fs = require('fs');
const findUp = require('find-up');
const path_dirname = require('path').dirname;
const { logger } = require('../utils/logger');
const R_path = require('ramda').path;
var find = require('find');
const { finishedEjecution } = require('../utils/composerUtils');
const home = () => {

    //console.log(`You are in folder: ${process.cwd()}`);

    findUp('.cellsrc')   
    .then(filepath => {
        if (!filepath) {
            console.log('.cellsrc not found in parent folders');
            return false;
        }
        let objCellsrc = JSON.parse(fs.readFileSync(filepath));
        let appId = R_path(['composer','appId'], objCellsrc);

        if (path_dirname(filepath) === process.cwd() && appId !== undefined) {
            console.log('It seems that you are already in the right folder');
            process.exit(0);
        }

        if (appId === undefined) {
            logger().warn(`Nearest up '.cellsrc' path: ${filepath} doesn't look as a valid app '.cellsrc' file. The 'appId' key not found on it.`);
        }
        else {
           console.log(`To go to the nearest upwards app folder run =>\n\tcd ${path_dirname(filepath)}`)
        }
        
    });
    
    find.eachfile(process.cwd(), function(file) {
        if (file.includes('.cellsrc')) {
            let objCellsrc = JSON.parse(fs.readFileSync(file));
            let appId = R_path(['composer','appId'], objCellsrc);
            if (appId === undefined) {
                logger().warn(`Nearest down'.cellsrc' path: ${file} doesn't look as a valid app '.cellsrc' file. The 'appId' key not found on it.`);
            }
            else {
                logger().info(`To go to the nearest downwards app folder run =>\n\tcd ${path_dirname(filepath)}`);
            }
        }
    });
}

module.exports = home;      