"use strict";

const fs_existsSync = require("fs").existsSync;
const inquirer_prompt = require("inquirer").prompt;
const execSync = require("mz/child_process").execSync;
const path_relative = require("path").relative;

const logger = require('./utils/logger')['logger'];

const expecter = (thisArg, _arguments, P, generator) => {

    const processPromise = (resolve, reject) => {

        const resolved = value => { 
            try { 
                step(generator.next(value));
            }
            catch (e) {
                reject(e);
            }
        };

        const rejected = value => { 
            try {
                step(generator["throw"](value));
            }
            catch (e)
            {
                reject(e);
            }
        };

        const step = result => {
            result.done ? resolve(result.value) : 
            new Promise( resolve => { resolve(result.value); })
            .then(resolved, rejected); 
        };

        step((generator = generator.apply(thisArg, _arguments || [])).next());
    }

    return new (P || (P = Promise))(processPromise);
};


const checkIsMinGW = () => {

    const isWindows = /^win/.test(process.platform);

    if (!isWindows) {
        return false;
    }

    try {
        const uname = execSync('uname -s').toString();
        return !!/^mingw/i.test(uname);
    }
    catch (error) {
        return false;
    }
};

const genQuestion = function* () {
    const rawQuestion = {
        type: checkIsMinGW() ? 'rawlist' : 'list',
        name: 'foo',
        message: question.message,
        choices: question.choices,
    };
    const answers = yield inquirer_prompt([rawQuestion]);
    return answers.foo;
};

const prompt = question => expecter(this, void 0, void 0, genQuestion);

const indent = (str, additionalIndentation = '  ') => {
    return str.split('\n')
        .map((s) => s ? additionalIndentation + s : '')
        .join('\n');
};


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

const handlerError = params => err => {
    if (params.softExecution) {
        continueError(err);
        return params; 
    } 
    finishError(err);
};

const finishError = err => {
    let errorMsg = err.stack || err;
    logger().error(errorMsg);
    process.exit(1);
};

const continueError = err => {
    let errorMsg = err.message || err;
    logger().error(errorMsg);
};

const replace = (source, ...args) => {
    for (let i = 0; i < args.length; i++) {
      source = source.replace('#{'+i+'}', args[i]);
    }
    return source;
};

function DecorateError(message) {
    this.name = '...aborting execution';
    this.message = logger().warn(message + `\nFor debugging info run "LOG_LEVEL='debug' composer ${process.argv.slice(2).join(' ')}"`);
    this.stack = logger().debug((new Error()).stack);
}
DecorateError.prototype = Object.create(Error.prototype);
DecorateError.prototype.constructor = DecorateError;

exports.expecter = expecter;
exports.prompt = prompt;
exports.indent = indent;
exports.dealRejection = dealRejection;
exports.dealException = dealException;
exports.handlerError = handlerError;
exports.replace = replace;
exports.DecorateError = DecorateError;