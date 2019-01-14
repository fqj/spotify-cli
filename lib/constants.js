'use strict';

const path = require('path');

const APP_FOLDER = 'app';
const APP_CONFIG_PATH = `${APP_FOLDER}/config`;
const CONFIG_FOLDER = path.resolve(`${APP_FOLDER}/config`);
const LOCALES_FOLDER = 'locales-app'
const LOCALES_GLOB_PATTERN = '**/locales/*.json';
const ROOT_LOCALES_GLOBAL_PATTERN = `${APP_FOLDER}/${LOCALES_FOLDER}/*.json`;
const ROOT_LOCALES = `${APP_FOLDER}/${LOCALES_FOLDER}`;

module.exports = {
    APP_CONFIG_PATH,
    CONFIG_FOLDER,
    LOCALES_FOLDER,
    LOCALES_GLOB_PATTERN,
    ROOT_LOCALES,
    ROOT_LOCALES_GLOBAL_PATTERN,
}
