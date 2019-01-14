'use strict';

const fs = require('fs-extra');
const path_join = require('path').join;
const handlerError = require('../../lib/util').handlerError;
const sass = require('../utils/adapterSass').sass;
const logger = require('../utils/logger').logger;
const DecorateError = require('../util').DecorateError;

const compileSass = parameters => {
    parameters.sass = parameters.sass || {};
    if (parameters.sass.sourceDir === undefined) {
      parameters.sass.sourceDir = process.cwd();
    }
    return Promise.resolve(parameters).then(sass);
};
  
const prepareCompileFiles = parameters => {
    const { source, destination } = parameters; 

    if (!fs.existsSync(source)) throw new DecorateError(`Source folder does not exist`);

    const sassParameters = {}
    sassParameters.sourceDir = path_join(process.cwd(), source);
    sassParameters.outputDir = path_join(process.cwd(), destination);
    parameters.sass = sassParameters; 
    logger().info(`.sass files will be compiled inti the following folder:
    ${sassParameters.outputDir}`);

    return Promise.resolve(parameters);

};


const _sass = _params => {

    let defaultDestination =  'app/styles';
    let defaultSource = 'app/styles';

    _params.destination = (!_params.commandOptions._all.destination)? defaultDestination : _params.commandOptions._all.destination;
    _params.source = (!_params.commandOptions._all.source)? defaultSource : _params.commandOptions._all.source;

    return Promise.resolve(_params)
        .then(prepareCompileFiles)
        .then(compileSass)
        .catch(handlerError(_params))
        .then(_ => _params);
};

module.exports = _sass;


