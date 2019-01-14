"use strict";

const { expecter, dealException, dealRejection } = require("./util");
const logger = require('./utils/logger').logger;
const path = require('path');
const fs_existsSync = require('fs').existsSync;
const parameters = require("../config/parameters");
const globalArgs = require("./commands-list/global_args");
const commands_list = require("./commands-list/command-list");
const COMMANDS_PATH = './commands/';
const COMMANDS_LIST_PATH ='./commands-list/command-list';
const commandProvided = process.argv[2];
const DecorateError = require('./util').DecorateError;
const g = require('chalk').green;

dealException();
dealRejection();

let commandOrig = (commandProvided)? commandProvided.replace("app:composer:", "") : '';
let command = commandOrig.replace(":", "-");
const commandObj = require(COMMANDS_LIST_PATH)[command];

class Command {
    constructor() {
        this.name = commandObj.name.replace(":", "-");
        this.aliases = commandObj.aliases;
        this.description = commandObj.description;
        this.args = commandObj.args;
    }
    run(params) {
        return expecter(this, void 0, void 0, function* () {
            yield (yield Promise.resolve().then(() => require(COMMANDS_PATH + this.name)))(params);
        });
    }
}

class ComposerCli {

    constructor(args) {

        this.commands = new Map();
        this.parameters = parameters;
        this.values = [];
        this.args = args;
        this.command = {}

        if(this.args.length === 0 || this.args[0] === '--help' || this.args[0] === '-h' || this.args[1] === '--help' || this.args[1] === '-h') {
            const help = require("./commands-list/help")
            this.addCommand(new help.Command()); 
        }

        const command = this.args[0];
        const arrayCommands = Object.keys(commands_list);

        if(arrayCommands.includes(command)) {
 
            this.addCommand(new Command());
            this.parameters.command = command;
        }

        let cellsrcAppFile = path.join(process.cwd(), '.spotysrc');
        if (!fs_existsSync(cellsrcAppFile) && command !== 'home') {
            logger().warn(`To run this command, you need to be in the app root folder.\nRun ${g('spotify home')} to find the app root folder.`);
            process.exit(0);
        }
    }

    addCommand(command) {
        this.commands.set(command.name, command);
        command.aliases.forEach(alias => this.commands.set(alias, command));
    }

    run() {
        return expecter(this, void 0, void 0, function* () {
            const help = require("./commands-list/help")
            this.addCommand(new help.Command()); 
            const helpCommand = this.commands.get('help');

            const commandNames = Object.keys(commands_list);


            
            const commandLineArgs = require("command-line-args");
            const commandLineCommands = require("command-line-commands");
            let parsedArgs;


            if (this.args.indexOf('--version')> -1 || this.args.indexOf('-v')> -1) {
                console.log(require('../package.json').version);
                return Promise.resolve();
            }

            try {
                parsedArgs = commandLineCommands(commandNames, this.args);
            }
            catch (error) {
                if (error.name !== 'INVALID_COMMAND') throw new DecorateError;
                if (error.command) {
                    logger().warn(`'${error.command}' is not a valid command. Try ${g('composer --help')} to get the list of available commands.`);
                    process.exit(0);
                }
                return helpCommand.run({ command: error.command });
            }

            const commandName = parsedArgs.command;
            const commandArgs = parsedArgs.argv;
            const command = this.commands.get(commandName);
            let commandOptions = commandArgs.filter(option => option.startsWith("-"));
            const validArgs = command.args.map(i => '--'+i.name);
            const validAlias = command.args.map(i => '-'+i.alias);
            const argsAndAlias = validArgs.concat(validAlias);

            argsAndAlias.push('--help');
            argsAndAlias.push('-h');

            commandOptions.forEach(option => {
                if(!argsAndAlias.includes(option)) {
                    logger().warn(`Unknown option provided: ${option}. For more details about valid options try ${g('cells app:composer:')}${g(commandName)} ${g('-h')}.`);
                    process.exit(0);
                }
            });

            if (command == null) throw new DecorateError('command is null');

            const commandDefinitions = globalArgs.mergeArguments([command.args, globalArgs.globalArguments]);
            commandOptions = commandLineArgs(commandDefinitions, { argv: commandArgs, stopAtFirstUnknown: true });

            if (commandOptions['_all']['help']) return helpCommand.run({ command: commandName });

            this.parameters.subcommands = (commandOptions._unknown)? commandOptions._unknown: {};
            this.parameters.commandOptions = commandOptions;
            this.parameters.locales = Object.assign(this.parameters.locales, commandOptions);
            return command.run(this.parameters);

        });
    }
}

exports.ComposerCli = ComposerCli;