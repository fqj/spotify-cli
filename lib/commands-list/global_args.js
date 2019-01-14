"use strict";

exports.globalArguments = [
    {
        name: 'spotify-cli-version',
        alias: 'c',
        description: 'The spotify-cli version  for this instance',
        group: 'global'
    },
    {
        name: 'version',
        alias: 'v',
        description: 'The spotify-cli version',
        group: 'global'
    },
    {
        name: 'help',
        description: 'Print out helpful usage information',
        type: Boolean,
        alias: 'h',
        group: 'global',
    }
];

const mergeArguments = argumentLists => {
    const argsByName = new Map();
    for (const args of argumentLists) {
        for (const arg of args) {
            argsByName.set(arg.name, Object.assign({}, argsByName.get(arg.name), arg));
        }
    }
    return Array.from(argsByName.values());
}

exports.mergeArguments = mergeArguments;
