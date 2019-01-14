"use strict";


const updateNotifier = require("update-notifier");
const composer_cli = require("./spoti-cli");
const packageJson = require('../package.json');
const logger = require('./utils/logger')['logger'];
const { expecter } = require("./util");

updateNotifier({ pkg: packageJson }).notify();

const execCommand = function* () {
    

    const argsProvided = process.argv.slice(3);
    const commandArr = [];
    const commandProvided = process.argv[2];
    const command = (commandProvided)? commandProvided.replace(":", "-") : '';

    commandArr.push(command);

    const args = commandArr.concat(argsProvided)

    const cli = new composer_cli.ComposerCli(args);
    try {
        const result = yield cli.run();
        if (result && result.constructor && result.constructor.name === 'CommandResult') {
            process.exit(result.exitCode);
        }
    }
    catch (err) {
        logger().warn(err);
        if (err.stack) {
            logger().error(err.stack);
        }
        process.exit(1);
    }

};

(() => expecter(this, void 0, void 0, execCommand))();

