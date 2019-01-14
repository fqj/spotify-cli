const { cl, setToken, clientCredentialsGrant, spotifyApi, showError } = require('../utils/utils.js');
const {red, cyan, grey} = require('chalk');
/**
 * This example retrieves the top tracks for an artist.
 * https://developer.spotify.com/spotify-web-api/get-artists-top-tracks/
 */

/**
 * This endpoint doesn't require an access token, but it's beneficial to use one as it
 * gives the application a higher rate limit.
 *
 * Since it's not necessary to get an access token connected to a specific user, this example
 * uses the Client Credentials flow. This flow uses only the client ID and the client secret.
 * https://developer.spotify.com/spotify-web-api/authorization-guide/#client_credentials_flow
 */


 
const _returnId = data => {
  if(data.body.artists.items.length === 0){
      showError('Cero result with that entry');
  }

  let artist = data.body.artists.items[0];
  return artist.id;

}

const getAlbumId = (data, name) => {
    
    let albumId = data.body.items
            //  .filter(album => album.name === name) //'Girls in Peacetime Want to Dance'
            .map(item => item.id);

    return albumId;
}
    


const showAlbums = idsAlbums => {

    idsAlbums.map( albumId => 
        spotifyApi.getAlbum(albumId).then( (album, pos) => {

            console.log(`
            ${pos+1}.
            Name: ${cyan(album.body.name)}
            Label: ${cyan(album.body.label)}
            Tracks: ${cyan(album.body.tracks.items.map(
                (item, pos) => ` 
                ${pos+1}:  ${item.name}`))}
            Genres: ${cyan(album.body.genres)}
            Copyrights: ${cyan(album.body.copyrights)}
            Popularity: ${cyan(album.body.popularity)}

            Release date: ${cyan(album.body.release_date)}
            Total tracks: ${cyan(album.body.total_tracks)}
            Id: ${cyan(album.body.id)}
            External url: ${cyan(album.body.external_urls)}
            External ids: ${cyan(album.body.external_ids)} 
            Uri: ${cyan(album.body.uri)} 
            `)

            //Available markets: ${cyan(album.body.available_markets)}
        })
    )

};



    


const getArtistId = artist => spotifyApi.searchArtists(artist).then(_returnId);


module.exports = param => {

  let artist = param.subcommands[0];

  spotifyApi.clientCredentialsGrant()
    .then((data, param) => spotifyApi.setAccessToken(data.body['access_token']))
    .then(() => getArtistId(artist))
    .then(id => spotifyApi.getArtistAlbums(id))
    .then(albums => getAlbumId(albums))
    .then( ids => showAlbums(ids))
    .catch(function(err) {
        if(err.message === 'read ECONNRESET') {
            console.log('Unfortunately, something has gone wrong. Check your internet conexion');
        }
  });

}