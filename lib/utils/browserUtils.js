'use strict';

const { logger } = require('./logger');
const execSync = require('child_process').execSync;

const composerConfig = require('../../config/composer-config');
const { _getDockerHostUrl } = require('./portsUtils');

const _openInBrowser = (browser, commandsOption, url) => {
    const plat = process.platform;

    logger().debug(`Launching Composer UI on '${browser}', platform: '${process.platform}'`);
    const objBrowser = {
        'win32': {
            'chrome': "chrome",
            'Chrome': "chrome",        
            'firefox': "Firefox",
            'Firefox': "Firefox"
        },
        'darwin': {
            'chrome': "Google Chrome",
            'Chrome': "Google Chrome",        
            'firefox': "Firefox",
            'Firefox': "Firefox"
        },
        'linux': {
            'chrome': "google-chrome",
            'Chrome': "google-chrome",        
            'firefox': "Firefox",
            'Firefox': "Firefox"
        }
    }
    logger().debug('_openInBrowser');
    logger().debug(`Launching Composer UI on '${browser}', platform: '${plat}'`);

    const ObjPlatform = {
        'win32': `start ${objBrowser[plat][browser]} ${commandsOption} "${url}"`,
        'darwin': `open -na "${objBrowser[plat][browser]}" --args '${url}' ${commandsOption}`,
        'linux': `"${objBrowser[plat][browser]}"  ${commandsOption} '${url}'`,
        'null': null
    }

    if ( composerConfig.composer.COMPOSER_BROWSER_COMPATIBILITY[browser] ) {
        if ( composerConfig.composer.COMPOSER_BROWSER_COMPATIBILITY[browser][plat] ) {
           // execSync(`open -na "${objBrowser[browser]}" --args '${url}' ${commandsOption} `);
           execSync(ObjPlatform[plat])
        } else {
            logger().error(`Browser '${browser}' not supported for platform '${plat}'`);
        }
    } else {
        logger().error(`Browser '${browser}' not supported`);
    }
};

const _launchComposerUi = parameters => {
    logger().debug('_launchComposerUi');
    const browser = (parameters.subcommands.length)? parameters.subcommands[0] : composerConfig.composer.CB_BROWSER;
    let validOptions = '';
    if(parameters.subcommands.length) validOptions = parameters.subcommands.slice(1).join(' ');
    const commandOptions = Object.keys(parameters.commandOptions._all);
    validOptions = commandOptions.map(i => '--'+i).join(' ');

    return new Promise((resolve, reject) => {
        _getDockerHostUrl(parameters).then(url => {
            _openInBrowser(browser, validOptions, url);
            resolve(parameters);
        }).catch(reject);
    });
};

module.exports = {
    _openInBrowser,
    _launchComposerUi
}