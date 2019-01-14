'use strict';

const { cl, setToken, clientCredentialsGrant, spotifyApi, showError } = require('../utils/utils.js');
const {red, cyan, grey} = require('chalk');

let processDataArtist = data => {
    if(data.body.artists.items.length === 0){
        showError('Cero result with that entry');
    }
    let artist = data.body.artists.items[0];
    cl(`
    
            ${cyan(`'${artist.name.toUpperCase()}'`)}
    
                Genres: ${cyan(artist.genres)}
                Id: ${cyan(artist.id)}
                Followers: ${cyan(artist.followers.total)}
                Popularity: ${cyan(artist.popularity)}
    

   ${grey('Source: Spotify')}`) 
}

const showAlbums = artist => spotifyApi.getArtistAlbums(artist).then( processDataArtist, showError);

module.exports = params => {
        let artist = params.subcommands[0];
        clientCredentialsGrant()
            .then(token => setToken(token, artist))
            .then((artist) => showAlbums(artist))
}


