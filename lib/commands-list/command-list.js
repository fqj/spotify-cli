"use strict"

const commands = {
    'album-tracks': {
        name: 'album:tracks',
        aliases: [],
        description: `Show all tracks of an album.`,
        extended_description: `Show all tracks of an album. 
        
        USAGE: spoty albums:track <album>
        EXAMPLE: spoty albums:track 'Girls in Peacetime Want to Dance'`,
        args: []
    },
    'artist-albums': {
        name: 'artist:albums',
        aliases: [],
        description: `Show all albums of an artist.`,
        extended_description: `Show all albums of an artist. 
        
        USAGE: spoty artist:albums <artist>
        EXAMPLE: spoty artist:albums 'David Bowie'`,
        args: []
    },
    'artist-id': {
        name: 'artist:id',
        aliases: [],
        description: `Show the artist'id.`,
        extended_description: `Show the artist'id.
        
        USAGE: spoty artist:id <artist>
        EXAMPLE: spoty artist:id 'David Bowie'`,
        args: []
    },
    'artist-search': {
        name: 'artist:search',
        aliases: [],
        description: 'Search main info about the artist provided',
        extended_description: `Search main info about the artist provided. 
        
        USAGE: spoty artist:search <artist>
        EXAMPLE: spoty artist:search 'David Bowie'`,
        args: []
    },
    'artist-top-track': {
        name: 'artist:top-track',
        aliases: [],
        description: 'Show ten-top songs os the artist',
        extended_description: `Show ten-top songs os the artist.
        
        USAGE: spoty artist-top-track <artist>
        EXAMPLE: spoty artist-top-track Muse`,
        args: []
    },
    'getInfo': {
        name: 'getInfo',
        aliases: [],
        description: 'Returns name and artist about current song in spotify.',
        extended_description: `Returns name and artist about current song in spotify.
        
        USAGE: spoty getInfo
        EXAMPLE: spoty getInfo`,
        args: []
    },

    'home': {
        name: 'home',
        aliases: [],
        description: 'Shows nearest app folder (where the .spotysrc file is located).',
        extended_description: `Shows nearest app folder (where the .spotysrc file is located).
        
        USAGE: spoty home
        EXAMPLE: spoty home`,
        args: []
    },
    'id': {
        name: 'id',
        aliases: [],
        description: 'Returns the id of the artist provided',
        extended_description:`Returns the id of the artist provided.


        USAGE: spoty app:Spoty:id
        EXAMPLE: spoty:id`,
        args: []
    },
    'import': {
        name: 'import',
        aliases: [],
        description:`Imports the draft from the app folder provided.`,
        extended_description: `Imports the draft from the app folder provided.
        This folder must be under the Spoty app definitions folder of the app.
        
        The app definitions folder is on the following route:
             <root app folder>/Spoty/exports
        
        USAGE: spoty:import [[ --list | -l ] | [ --force-draft | -f ]]
        EXAMPLE: spoty:import 2018_03_19_10_32_13-app0001.1521451933730/initial
        where 2018_03_19_10_32_13-app0001.1521451933730/initial is under <app>/Spoty/exports folder.`,
        args:  [
            {
                name: 'list',
                alias: 'l',
                description: 'Lists all the available drafts ready to be imported under the Spoty app definitions folder of the app',
                type: Boolean
            },
            {
                name:  'force-draft',
                alias: 'f',
                description: 'Replace the actual draft (if any) with the imported one',
                type: Boolean
            }
        ]
    },
    'load-configs': {
        name: 'load-configs',
        aliases: [],
        description: `Imports a set of configurations.`,
        extended_description: `Imports a set of configurations.
        
          The set of configurations loaded are those available in the App 'config' folder.
          If any of the variables available in those files should be excluded from the loading process
          it can be specified in the variableExclusions section of the .cellsrc file:
          
             ...
             "variableExclusions": [
                "configVar-to-exclude-1",
                "configVar-to-exclude-2"
             ]
             ...
            `,
        args: []
    },
    'load-list': {
        name: 'load-locales',
        aliases: [],
        description: 'Import the locales of the app into the live-preview of Spoty.',
        extended_description: `Import the locales of the app into the live-preview of Spoty.
        
        USAGE: spoty:load-locales
        EXAMPLE: spoty:load-locales`,
        args: []
    },

    'logs': {
        name: 'logs',
        aliases: [],
        description: 'Shows logs from Spoty.',
        extended_description: `Shows logs from Spoty.
        
        
        USAGE: cells Spoty:logs <commands|Spoty|db|all|all-follow>
        EXAMPLE: cells Spoty:logs all-follow`,
        args: []
    },

    'next': {
        name: 'next',
        aliases: [],
        description: '',
        extended_description: `.
        
        USAGE: 
        EXAMPLE: `,
        args: []
    },
    'prev': {
        name: 'prev',
        aliases: [],
        description: '',
        extended_description: `.
        
        USAGE: cells Spoty:ps
        EXAMPLE: cells Spoty:ps`,
        args: []
    },
    'pause': {
        name: 'pause',
        aliases: [],
        description: 'Pause th.',
        extended_description: `Pause . 
        
        Stop and Start of Spoty.
                
        USAGE: spoty pause
        EXAMPLE: spoty pause`,
        args: []
    },
    'play': {
        name: 'play',
        aliases: [],
        description: 'Start the Spotify instance playing song.',
        extended_description: `Start the Spotify instance playing song.. 
        
        It will fetch the latest images from the Cells Docker Registry and start containers with them. If you want to use other images than the latest release, you may use Profile Configuration.
        Almost every command should be run after this one, since they may require the platform to be running.
                
        USAGE:  spoty start
        EXAMPLE: spoty start`,
        args: [
            {
                name: 'Spoty-version',
                alias: 'c',
                description: 'The Spoty version for this instance',
            }
        ]
    },

    'shuffle': {
        name: 'shuffle',
        aliases: [],
        description: 'Toggle shuffle',
        extended_description: `Toggle shuffle. 
        
        USAGE: spoty shuffle
        EXAMPLE: spoty shuffle`,
        args: []
    },
    'status': {
        name: 'status',
        aliases: [],
        description: 'Shows status of Spotify instance.',
        extended_description: `Shows status of Spotify instance. 
        
        USAGE: spoty status
        EXAMPLE: spoty status`,
        args: []
    },
    'stop': {
        name: 'stop',
        aliases: [],
        description: 'Stop the Spotify instance playing song.',
        extended_description: `Stop the Spotify instance playing song. 
        
        
        USAGE: spoty stop
        EXAMPLE: spoty stop`,
        args: []
    },
    'volume': {
        name: 'volume',
        aliases: [],
        description: 'Volumes ',
        extended_description: `Synchronizes .
        
        USAGE: sync
        EXAMPLE: sync`,
        args: []
    },
    'mute': {
        name: 'mute',
        aliases: [],
        description: 'Launches Spoty UI.',
        extended_description: `Launches Spoty UI. 
        
        Launches Spoty UI on the Chrome browser by default or in the specified <browser>.
        Furthermore can be launched in incognito mode and in a new window.
        The browser can be changed via profile variable.
                 
        USAGE: cells Spoty:ui [<browser>] [--new-window] [--incognito]
        EXAMPLE: cells Spoty:ui chrome --new-window --incognito`,
        args: [
            {
                name: 'new-window',
                description: 'Open the browser in a new window',
            },
            {
                name:'incognito',
                description: 'Open the browser in incognito mode',
        }]
    },
    'record': {
        name: 'record',
        aliases: [],
        description: '',
        extended_description: `.
        
        USAGE: 
        EXAMPLE: `,
        args: []
    },
    'upgrade': {
        name: 'upgrade',
        aliases: [],
        description: 'Upgrades the ',
        extended_description:`Upgrades the ` ,
        args: []
    }
}

module.exports = commands;




