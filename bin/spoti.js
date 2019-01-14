#!/usr/bin/env node

'use strict';


process.title = 'spoti';


var semver = require('semver');
var version = require('../package.json').engines.node;

// Exit early if the user's node version is too low.
if (!semver.satisfies(process.version, version)) {
  // Strip version range characters leaving the raw semantic version for output
  var rawVersion = version.replace(/[^\d\.]*/, '');
  console.log(
      'Spotify-CLI requires at least Node v' + rawVersion + '. ' +
      'You have ' + process.version + '.\n' +
      'See https://spoti-cli/doc/node-support ' +
      'for details.');
  process.exit(1);
}

// Ok, safe to load ES2015.
require('../lib/run');
