"use strict";


const logger = require('../utils/logger').logger;

const dealRejection = () => {
    
    const infoRejection = error => {
        logger().error(`Promise rejection: ${error}`);
        if (error && error.stack)
            logger().error(error.stack);
        process.exit(1);
    }

    process.on('unhandledRejection', infoRejection);

};

const dealException = () => {
    
    const _infoException = error => {
        logger().error(`Uncaught exception: ${error}`);
        if (error && error.stack) {
            logger().error(error.stack);
        }
        process.exit(1);
    };

    process.on('uncaughtException', _infoException);

};

const dealErrors = () => {
    dealException();
    dealRejection();
}

exports.dealErrors = dealErrors;

