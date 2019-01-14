'use strict';

const { logger } = require('../utils/logger');
const composerConfig = require('../../config/composer-config'); 
const { loadVars, informVersion, startExecution, finishedEjecution } = require('../utils/composerUtils');
const { dockerStartup } = require('../utils/dockerUtils');
const { _cleanImages, _cleanLivePreviewImage } = require('../utils/livePreviewUtils');

const _infoAfterClean = ( _params, msg) => {
    logger().info(msg);
    return _params;
}

const upgrade = _params => {
    logger().info(`Performing upgrade of images for version => [${composerConfig.composer.CELLS_TAG_VERSION}]`);
    const _msg = (!_params)?  'Ready to upgrade, execute: composer start' : 'Ready to upgrade, execute: cells composer start';
    return Promise.resolve(_params)
        .then(startExecution)
        .then(loadVars)
        .then(informVersion)
        .then(dockerStartup)
        .then(_cleanImages)
        .then(_cleanLivePreviewImage)
        .then(_infoAfterClean(_params, _msg))
        .then(() => finishedEjecution(_params.command));
};

module.exports = upgrade;