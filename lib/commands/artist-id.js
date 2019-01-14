'use strict';

const { cl, fetchPage, setToken, clientCredentialsGrant, spotifyApi, showError } = require('../utils/utils.js');
const {red, cyan, grey} = require('chalk');
const fetch = require('node-fetch');

let processDataArtist = data => {
    if(data.body.artists.items.length === 0){
        showError('Cero result with that entry');
    }
    let artist = data.body.artists.items[0];
    cl(`
   ${artist.name} id: ${cyan(artist.id)}

   ${grey('Source: Spotify')}`) 
}

const showArtist = artist => spotifyApi.searchArtists(artist).then( processDataArtist, showError);

module.exports = params => {

        let artist = params.subcommands[0];
        clientCredentialsGrant()
            .then(token => setToken(token, artist))
            .then((artist) => showArtist(artist))
}
