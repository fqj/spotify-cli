
const path = require('path');

module.exports = {
    "composer": { 
        "appId": "",
        "version": "^1.0.10",
        "bridge": { 
            "componentsPath": "./components/",
            "composerEndpoint": "./composerMocks/",
            "deployEndpoint": ""
        },
        "bowerExclusions": [ "web-component-tester", "polymer", "cells-polymer-bridge" ]
    },
    "core": {
        "analytics": {
            "id": "UA-69454462-11"
        },
        "commandDir": "commands",
        "rcFiles": ".cellsrc"
    },
    "docker": {
        "CELLS_DOCKER_HOST_IP": "127.0.0.1"
    },
    "locales": {
        "rootLocalesFolder": "app/locales-app",
        "rootLocalesPattern": "app/locales-app/*.json",
        "destination": path.join(process.cwd(), '.'),
        "source": [ path.join(process.cwd(), '.') ]
    }
}