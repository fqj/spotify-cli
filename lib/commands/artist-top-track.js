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

const showTopTrack = data => {

  data.body.tracks.forEach(function(track, index) {
    console.log(`
        ${index+1}. ${cyan(track.name)} (popularity: ${cyan(track.popularity)})
    `);
  });
  process.exit(0);

}



const getArtistId = artist => spotifyApi.searchArtists(artist).then(_returnId);


module.exports = param => {

  let artist = param.subcommands[0];

  spotifyApi.clientCredentialsGrant()
    .then((data, param) => spotifyApi.setAccessToken(data.body['access_token']))
    .then(() => getArtistId(artist))
    .then(id => spotifyApi.getArtistTopTracks(id, 'GB'))
    .then(showTopTrack)
    .catch(function(err) {
      console.log('Unfortunately, something has gone wrong.', err.message);
  });

}