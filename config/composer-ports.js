
const ports = {
    COMPOSER_COMMANDS_PORT_INTERNAL: process.env.COMPOSER_COMMANDS_PORT_INTERNAL || '9999',
    COMPOSER_COMMANDS_HTTP_PORT_INTERNAL: process.env.COMPOSER_COMMANDS_HTTP_PORT_INTERNAL || 9998,
    IDLE_NETWORK_PORTS : new Map([
        ['COMPOSER_API_PORT', 1024],
        ['COMPOSER_UI_PORT', 1025],
        ['COMPOSER_COMMANDS_PORT', 1027],
        ['COMPOSER_COMMANDS_HTTP_PORT', 1028]
    ]),
    DEV_PORTS: {
        composer: new Map([
            ['COMPOSER_API_PORT', 50000],
            ['COMPOSER_UI_PORT', 50001],
            ['COMPOSER_COMMANDS_PORT', 50003],
            ['COMPOSER_COMMANDS_HTTP_PORT', 50004]
        ]),
        livePreview: new Map([
            ['COMPOSER_LIVE_PREVIEW_PORT', 50010]
        ])
    }
}

module.exports = ports;