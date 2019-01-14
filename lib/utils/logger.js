'use strict';

const winston = require('winston');

winston.config.allColors.error = 'red';
winston.config.allColors.warn = 'yellow';
winston.config.allColors.info = 'green';
winston.config.allColors.debug = 'cyan';

const localDateStringFormat = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};
const tsFormat = () => `[${( new Date() ).toLocaleDateString(undefined, localDateStringFormat)} ${( new Date() ).toLocaleTimeString()}]`;

const logFormatter = function(options) {
  // Return string will be passed to logger.

  let formatted =  (options.message ? options.message : ``) +
      (options.meta && Object.keys(options.meta).length ?
          `\n\t`+ JSON.stringify(options.meta) : `` );

  return options.colorize ? winston.config.colorize(options.level, formatted) : formatted;
};

let _logger = null;

const logger = () => {
  _logger = _logger || new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
          silent: process.env.NODE_ENV === 'test',
          timestamp: tsFormat,
          formatter: logFormatter,
          level: process.env.LOG_LEVEL,
          colorize: true,
          prettyPrint: true
      })
    ]
  });

  return _logger;
};


module.exports = { logger };