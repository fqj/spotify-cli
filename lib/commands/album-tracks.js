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


 
const _returnArtistId = data => {

  if(data.body.artists.items.length === 0){
      showError('Cero result with that entry');
  }

  let artist = data.body.artists.items[0];
  return artist.id;

}



const getAlbumId = (data, name) => {

    let albumId = data.body.items
            .filter(album => album.name === name) //'Girls in Peacetime Want to Dance'
            .map(item => item.id);

    return albumId;
}

const getArtistId = artist => spotifyApi.searchArtists(artist).then(_returnArtistId);

const getTracksOfAlbum = albumId => {
    
    spotifyApi.getAlbum(albumId)
        .then(data => console.log(data));
}


/*

{ body: 
   { album_type: 'album',


     copyrights: [ [Object], [Object] ],
     external_ids: { upc: '744861105640' },
     external_urls: { spotify: 'https://open.spotify.com/album/3Gy0FCDIx9MoliXd3YcTBt' },
     genres: [],
     href: 'https://api.spotify.com/v1/albums/3Gy0FCDIx9MoliXd3YcTBt',
     id: '3Gy0FCDIx9MoliXd3YcTBt',

     label: 'Matador',
     name: 'Girls in Peacetime Want to Dance',
     popularity: 51,
     release_date: '2015-01-19',

     total_tracks: 12,
     tracks: 
      { href: 'https://api.spotify.com/v1/albums/3Gy0FCDIx9MoliXd3YcTBt/tracks?offset=0&limit=50',
        items: [Array],
        limit: 50,
        next: null,
        offset: 0,
        previous: null,
        total: 12 },
     type: 'album',
     uri: 'spotify:album:3Gy0FCDIx9MoliXd3YcTBt' },


*/

module.exports = param => {

  let artist = param.subcommands[0];
  let album = 'Girls in Peacetime Want to Dance' ; // param.subcommands[1];

  spotifyApi.clientCredentialsGrant()
    .then((data, param) => spotifyApi.setAccessToken(data.body['access_token']))
    .then(() => getArtistId(artist))
    .then(idArtist => spotifyApi.getArtistAlbums(idArtist))
    .then(albums => getAlbumId(albums, album))
    .then(id => getTracksOfAlbum(id))
    .catch(function(err) {
      console.log('Unfortunately, something has gone wrong.', err.message);
  });

}