const SpotifyWebApi = require('spotify-web-api-node');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const spotifyApi = new SpotifyWebApi({
    clientId: '01458d27419042ea87eb58e185636a59',
    clientSecret: 'ffae0567119c45fbb60424718d5aac98'
});

let codeAuth = 'BQDTQEbCHYQhDDtOemTtdeFAeq1Qb1htTUY8DOrIDRWJpuT8j8g0PXxBbHlWcnNIlg8EJQ1GxkL91DAklQkm-sL9zN4dAmV0rffOCV57Axjo5w7uGVhVM0hlleyY6LJJsOHMAb04KSLHdc3DKXtcUHGhHD57OyFlY59aTm2zGbGhMxSvMC2EcQLgOS42Hb3gP80QUDkLVM6tx9J-T2vnBgSnr7ZtglJ2F-rwGJwh7Wmjkx1uRh9vJZz-mMfzm-_rDmyoz1qixZ6rP1KQ_V1j'

let artist = '';
let song = '';
let tracks =  []; 
let items = [];


spotifyApi.setAccessToken(codeAuth)

let playlist = process.argv[2];

function capitalizeWord(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
    }
    return splitStr.join(' '); 
 }

let replaceBackslash = string => string.replace('\\','')

let getAlbumsOfArtist = id => spotifyApi.getArtistAlbums(id)

let getArtisId = data => {
    let validArtist = data.body.artists.items.filter(item => {
        return item.name === artist
    })
    return validArtist[0].id;
}

let getAlBumsId = data => {
    let albumsId = data.body.items
        .filter(item => item.album_type === 'album')
        .map(item => item.id);
    return albumsId;
}

let getTrackId = data => {

 //   console.log(data.map(item => item.map(item => item.name)))
    data.map(item => item.map(item => tracks.push(item)))

//      return tracks.map(item => item.uri);

   // return tracks.filter( item => replaceBackslash(item.name) === song);
    //return tracks.filter( item => replaceBackslash(item.name).includes(song));
    tracks.map(track => {
        let isSong = replaceBackslash(track.name) == capitalizeWord(song);
        if (isSong) {
            items.push(track.uri)
        }
    });
};

let getTracksOfAlbums = albumsIds => {

  let obj = [];

  albumsIds.map((item, pos) => {
      obj[pos] = Promise.resolve(spotifyApi.getAlbum(item));
  })

  return Promise.all(obj).then(albums => { 
      return albums.map( album => {
          return album.body.tracks.items.map( track => {
              return {
                  name:track.name,
                  id: track.id,
                  track: track.track_number,
                  artist: track.artists[0],
                  album: replaceBackslash(album.body.name),
                  disc_number: track.disc_number,
                  duration_ms: track.duration_ms,
                  external_urls: track.external_urls,
                  href: track.href,
                  uri: track.uri
              } 
          })
      }); 
  });
}


fs.readFile(playlist, 'utf8')
    .then((lines, err) =>  {
        var artistAndSong = [];
        artistAndSong.push(lines.trim().split('\n'));
        return artistAndSong;
    })
    .then( artistAndSong => {
        processPlayList(...artistAndSong);
    })


function searchArtists(item) {
    return new Promise(resolve => {
        artist = item.split('-')[0].trim();
        song = item.split('-')[1].trim();
        resolve(spotifyApi.searchArtists(artist))
    });
}

let obj = [];
let tracksToPlay = []
async function extractUri(item) {
  await searchArtists(item)
        .then(getArtisId)
        .then(getAlbumsOfArtist)
        .then(getAlBumsId)
        .then(getTracksOfAlbums)
        .then(getTrackId)
}

    async function processPlayList(playList) {
        for (const artistSong of playList) {
            await extractUri(artistSong)
        }
        //fetch("https://api.spotify.com/v1/me/player/play?device_id=14f2db4be57390bb2b84d75c2b2212cd43b2887f", {
        fetch("https://api.spotify.com/v1/me/player/play", {
            method: "PUT",
            body: JSON.stringify({
                "uris": items }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${codeAuth}`   
            }
        }).then(data => {
            console.log(data)})
}


/*
1. console log si el artista o la cancion no existe
*/
