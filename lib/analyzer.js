'use strict';

const fs = require('fs');
const path = require('path');
const { Analyzer, generateAnalysis } = require('polymer-analyzer');
const { FSUrlLoader } = require('polymer-analyzer/lib/url-loader/fs-url-loader');
const { PackageUrlResolver } = require('polymer-analyzer/lib/url-loader/package-url-resolver');

const { parseJson, replace, getDependenciesFile, getPackageName } = require('./utils/utils');

const mainVersionFiles = ['#{0}.html', '#{0}.js']; // files that can be main entrypoints (like the bower.main key)

const getMainFiles = componentPath => {
    const mainFiles = new Set();
    const componentPathRes = path.resolve(componentPath);

    // check the main key of the version file (if exist)
    const versionFile = getDependenciesFile(componentPathRes);
    if (versionFile) {
        if (typeof versionFile.main === 'string') {
            if (versionFile.main) {
                mainFiles.add(versionFile.main);
            }
        } else {
            (versionFile.main || []).forEach(key => mainFiles.add(key));
        }
    }

    // check folder name of component and the {component-name}.html or {component-name}.js files
    const componentName = getPackageName({ root: componentPathRes });
    for (let file of mainVersionFiles) {
        const filename = replace(file, componentName);
        const filePath = path.join(componentPathRes, filename);
        if (fs.existsSync(filePath)) {
            mainFiles.add(filename);
            break;
        }
    }

    return [...mainFiles];
}

/**
 * Run Polymer analyzer and generates descriptor.json and docs.html for the component
 * @param  {String} componentPath Path to component
 * @return {Promise}
 */
const analyzer = componentPath => {
    let inputs = getMainFiles(componentPath);

    const polymerAnalyzer = new Analyzer({
        urlLoader: new FSUrlLoader(componentPath),
        urlResolver: new PackageUrlResolver()
    });

    if (inputs && inputs.length) {
        return polymerAnalyzer.analyze(inputs)
            .then(analysis => generateAnalysis(analysis, componentPath));
    }

    return Promise.reject(`Nothing to analyze. Main keys not found`);
};

module.exports = {
    analyzer
};