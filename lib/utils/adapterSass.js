'use strict';


const fs_ensureFileSync = require('fs-extra').ensureFileSync;
const fs_writeFileSync = require('fs-extra').writeFileSync;
const find = require('find');
const nodeSass = require('node-sass');
const path = require('path');

const { replace } = require('../../lib/util');
const { logger } = require('./logger');

const COMMON_OUTPUT_FILE_TEMPLATED = '#{0}.css';


const writeCss = (outputFileName, outputDir = '.', css) => {
  return new Promise((resolve, reject) => {
    if (css instanceof Buffer) {
      try {
        const outputFile = replace(COMMON_OUTPUT_FILE_TEMPLATED, outputFileName);
        const outputPathToFile = path.join(outputDir, outputFile);
        fs_ensureFileSync(outputPathToFile);
        fs_writeFileSync(outputPathToFile, css);
        
        resolve(outputFile);
      } catch (exception) {
        reject(`Error while writing CSS to file.\n${exception}`);
      }
    } else {
      reject('Received CSS is not a Buffer.');
    }
  });
};

const sassError = (error) => {
  if (error.file) {
    const file = error.file.split(/\\|\//).pop();
    return `[SASS] in ${file} [line: ${error.line} | column: ${error.column}]\n${error.formatted}`;
  } else {
    return error.message;
  }
};

/**
 * Function to find out which files must be compiled
 * @param {*} sassParams
 */
const findSassFiles = (sassParams) => {
  let sassFiles = [];

  if (sassParams.file) {
    sassFiles.push(sassParams.file);
  } else if (sassParams.sourceDir) {
    return new Promise(
      (resolve, reject) => {
        find.file(/^((?!(bower_components|node_modules).*).)*.scss$/, path.resolve(sassParams.sourceDir), files => {
          sassFiles = sassFiles.concat(files);
          resolve(sassFiles);
        });
      }
    );
  }

  return Promise.resolve(sassFiles);
}

/**
 * Function to compile a single sass file to css
 * @param {*} filename
 */
const compileSassFile = (filename, sassParams) => {

  return new Promise((resolve, reject) => {
    nodeSass.render({ file: filename }, (error, result) => {
      if (error) {
        reject(new Error(sassError(error)));
      } else {
        //Remove file extension and retain the file name
        const sassFileParts = filename.split(path.sep);
        const sassFile = sassFileParts[sassFileParts.length-1];
        const outputFileName = sassFile.replace(/\.[^/.]+$/, '');
        const outputDir = sassParams.outputDir || '.';

        writeCss(outputFileName, outputDir, result.css)
          .then((outputFile) => {
            logger().info(`[SASS] '${outputFileName}' compiled into CSS successfully.`);
            resolve(outputFile);
          })
          .catch(reason => reject(new Error(reason)));
      }
    });
  });
};


/**
 * Append the output files generated when compiling sass files to the parameters argument
 * @param {*} parameters
 */
const appendSassOutputFiles = (parameters) => (sassOutputFiles) => { 
  Object.assign(parameters.sass, { sassOutputFiles }); 
  return parameters; }

const cleanOutputParams = (sassParams) => {
  delete sassParams.sassOutputFiles;
  return sassParams;
}

/**
 * Public function to compile from sass to css files
 * @param params
 * {
 *   file: filename to compile sass (String),
 *   all: this flag indicates if we have to look up into the current directory to find all sass files and compile them (except in bower_components* folder/s)
 * }
 */
const sass = params => {
  return Promise.resolve(params.sass)
    .then(cleanOutputParams)
    .then(findSassFiles)
    .then( processFiles => Promise.all(processFiles.map(filename => compileSassFile(filename, params.sass))))
    .then(appendSassOutputFiles(params));
};

module.exports = {
  sass,
  appendSassOutputFiles
};
