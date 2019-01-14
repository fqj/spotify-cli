"use strict";

const { expecter } = require("../util");

const chalk = require("chalk");
const commandLineUsage = require("command-line-usage");
const globalArgs = require("./global_args");
const logger = require('../utils/logger').logger;
const b = chalk.blue.bold;
const g = chalk.green.bold;
const c = chalk.cyan.bold.underline;
const w = chalk.white.bold;
const commands_list = require("./command-list");
const commandNames = Object.values(commands_list);

const SPOTY_TITLE = chalk.bold('SPOTY CLI');
const SPOTY_DESCRIPTION = 'The Spotify multi-tool for Spotify task';
const SPOTY_USAGE = 'Usage: \`spoty :<command> [options ...]\`';

const HELP_HEADER = ` 
${g('                     **************     ')}
${g('                     ****************    ')}
${g('              ********                 ******** ')}
${g('          *********                 *********')}
${g('   ********          **********        *********')}
${g('   ********        **************        *********')}
${g('   ***      *******            ********       ***')}   ${SPOTY_TITLE}
${g('   ***     **                          **         ***  ')}
${g('')}                                                   ${SPOTY_DESCRIPTION}
${g('')}
${g('')}    
${g('')}
${g('')}         
${g('')}
${g('')}
${g('')}                       ${SPOTY_USAGE}
`;


class Command {
    constructor(commands) {
        this.name = 'help';
        this.aliases = [];
        this.description = 'Shows this help message, or help for a specific command';
        this.args = [{
                name: 'command',
                description: 'The command to display help for',
                defaultOption: true,
            }];
        this.commands = commandNames;
    }
    generateGeneralUsage() {

        return commandLineUsage([
            {
                content: SPOTY_DESCRIPTION,
                raw: true,
            },
            {
                header: c('Available Commands'),
                content: Array.from(new Set(commandNames)).map(command => {
                    return { name: w(command.name), summary: command.description };
                }),
            },
            { header: c('Global Options'), optionList: globalArgs.globalArguments },
            {
                content: 'Run `cells composer:<command>  --help` for help with a specific command.',
                raw: true,
            }
        ]);
    }
    generateCommandUsage(command, config) {
        return expecter(this, void 0, void 0, function* () {
            const extraUsageGroups = command.extraUsageGroups ? yield command.extraUsageGroups(config) : [];
            const usageGroups = [
                {
                    header: c(`composer ${command.name}`),
                    content: command.extended_description,
                },
                { header: c('Command Options'), optionList: command.args },
                { header: c('Global Options'), optionList: globalArgs.globalArguments },
            ];
            if (command.aliases.length > 0) {
                usageGroups.splice(1, 0, { header: 'Alias(es)', content: command.aliases });
            }
            return commandLineUsage(usageGroups.concat(extraUsageGroups));
        });
    }
    run(options, config) {
        return expecter(this, void 0, void 0, function* () {
            const commandName = options['command'];
            if (!commandName) {
                logger().debug('No command given, printing general help...', { options: options });
                console.log(this.generateGeneralUsage());
                return;
            }
            const command = commands_list[commandName];
            if (!command) {
                logger().error(`'${commandName}' is not an available command.`);
                console.log(this.generateGeneralUsage());
                return;
            }
            logger().debug(`Printing help for command '${commandName}'...`);
            console.log(yield this.generateCommandUsage(command, config));
        });
    }
}

exports.Command = Command;
