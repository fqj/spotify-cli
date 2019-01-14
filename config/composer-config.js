/* eslint-disable */
const path = require('path');

const config = {
    composer: {
        ANSI_REPLACE_REGEXP: /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        CB_ENV_ACTIVE: process.env.CB_ENV_ACTIVE || 'DEFAULT',
        COMPOSER_VERSIONS_URL: process.env.COMPOSER_VERSIONS_URL || 'https://bbva-files.s3.amazonaws.com/cells/assets/cbx/versions/versions.json',
        ZELLS_REPO: process.env.ZELLS_REPO || 'globaldevtools.bbva.com:5000/cells/arch/composer/cellsbox',
        CELLS_TAG_VERSION: process.env.CELLS_TAG_VERSION || '^1.0.10',
        CELLS_CB_ID: process.env.CELLS_CB_ID || 'd5b34f8',
        CB_DOCKER_REGISTRY: process.env.CB_DOCKER_REGISTRY || '',
        CB_DOCKER_COMPOSE_YML_FILE: process.env.CB_DOCKER_COMPOSE_YML_FILE || path.join(__dirname, 'docker-compose.yml'),
        CB_DOCKER_COMPOSE_REDIS_YML_FILE: process.env.CB_DOCKER_COMPOSE_REDIS_YML_FILE || path.join(__dirname, 'docker-compose-redis.yml'),
        COMPOSER_API_IDENTITY: process.env.COMPOSER_API_IDENTITY || 'cells.local',
        CELLS_BOX_DB: process.env.CELLS_BOX_DB || 'composer_db',
        CELLS_BOX_API: process.env.CELLS_BOX_API || 'composer_api',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        CELLS_KNOWN_PORTS: process.env.CELLS_KNOWN_PORTS || 'REL',
        CB_BROWSER: process.env.CB_BROWSER || 'Chrome',
        CC_APP_RESOURCES_FILE: process.env.CC_APP_RESOURCES_FILE || '.cellsrc',
        CC_BOWER_JSON_FILE: process.env.CC_BOWER_JSON_FILE || 'bower.json',
        CC_BOWER_DIR: process.env.CC_BOWER_DIR || 'components',
        CC_ELEMENTS_DIR: process.env.CC_ELEMENTS_DIR || 'app/elements',
        CC_CONFIGS_DIR: process.env.CC_CONFIGS_DIR || 'app/config',
        CC_SEGMENTATIONS_DIR: process.env.CC_SEGMENTATIONS_DIR || 'composer/segmentations',
        CC_STYLES_DIR: process.env.CC_STYLES_DIR || 'app/styles',
        CC_LOCALES_DIR: process.env.CC_LOCALES_DIR || 'locales',
        CC_COMPOSER_APP_DEFS_DIR: process.env.CC_COMPOSER_APP_DEFS_DIR || 'composer/exports',
        CC_SPECS_TAR_FILE: process.env.CC_SPECS_TAR_FILE || 'specs.tar',
        COMPOSER_API_HOST: process.env.COMPOSER_API_HOST || '127.0.0.1',
        COMPOSER_API_PORT: process.env.COMPOSER_API_PORT || '20005',
        COMPOSER_UI_PORT: process.env.COMPOSER_UI_PORT || '20006',
        COMPOSER_REDIS_PORT: process.env.COMPOSER_REDIS_PORT || '56379',
        COMPOSER_COMMANDS_PORT: process.env.COMPOSER_COMMANDS_PORT || '20008',
        COMPOSER_COMMANDS_HTTP_PORT: process.env.COMPOSER_COMMANDS_HTTP_PORT || '20009',
        COMMANDS_DOCKER_PATH: '/tmp/composer',
        LOCALES_DOCKER_PATH: '/dist-composer/app/locales',
        STYLES_DOCKER_PATH: '/dist-composer/app/styles',
        FILE_CONFIG_PATH: path.join(process.cwd(), 'app/config'),
        FILE_SEGMENTATION_PATH: path.join(process.cwd(), 'composer/segmentations'),
        FILE_STYLES_PATH: path.join(process.cwd(), 'app/styles'),
        FILE_LOCALES_PATH: path.join(process.cwd(), 'locales'),
        DEFAULT_PROFILES_PATH: path.join(process.env[((process.platform === 'win32') ? 'HOMEPATH' : 'HOME')], '.cb', 'envs', '.env'),
        COMPOSER_BROWSER_COMPATIBILITY: {
            'safari': {},
            'Safari': {},
            'chrome': {
                'darwin': 'google chrome',
                'linux': 'google-chrome',
                'win32': 'chrome'
            },
            'Chrome': {
                'darwin': 'google chrome',
                'linux': 'google-chrome',
                'win32': 'chrome'
            },
            'firefox': {},
            'Firefox': {},
            'opera': {
                'darwin': 'opera',
                'linux': 'opera',
                'win32': 'opera'
            },
            'Opera': {
                'darwin': 'opera',
                'linux': 'opera',
                'win32': 'opera'
            }
        },
        COMPOSER_LOGS_CONFIG: {
            'commands': {
                filterString: 'composer_commands',
                flags: ['-t'],
                stdio: 'pipe'
            },
            'composer': {
                filterString: 'composer_api',
                flags: ['-t'],
                stdio: 'pipe'
            },
            'db': {
                filterString: 'composer_db',
                flags: ['-t'],
                stdio: 'pipe'
            },
            'all': {
                filterString: '',
                flags: ['-t'],
                stdio: 'pipe'
            },
            'all-follow': {
                filterString: '',
                flags: ['-t', '-f'],
                stdio: 'inherit'
            },
        },
        EXPOSED_CONFIG_KEYS: [
            'CB_ENV_ACTIVE',
            'ZELLS_REPO',
            'CELLS_TAG_VERSION',
            'CELLS_TAG_VERSION_LOWER',
            'CELLS_CB_ID',
            'CB_DOCKER_COMPOSE_YML_FILE',
            'CB_DOCKER_COMPOSE_REDIS_YML_FILE',
            'COMPOSER_API_IDENTITY',
            'CELLS_BOX_DB',
            'CELLS_BOX_API',
            'LOG_LEVEL',
            'CELLS_KNOWN_PORTS',
            'CB_BROWSER',
            'CC_APP_RESOURCES_FILE',
            'CC_BOWER_JSON_FILE',
            'CC_BOWER_DIR',
            'CC_ELEMENTS_DIR',
            'CC_CONFIGS_DIR',
            'CC_COMPOSER_APP_DEFS_DIR',
            'CC_SPECS_TAR_FILE',
            'COMPOSER_API_HOST',
            'COMPOSER_API_PORT',
            'COMPOSER_UI_PORT',
            'COMPOSER_REDIS_PORT',
            'COMPOSER_COMMANDS_PORT',
            'COMPOSER_COMMANDS_HTTP_PORT'
        ],
        LOCAL_FAMILY: 'local',
        MAX_WAITUP_TIME: 60
    },
    docker: {}
}

module.exports = config;
