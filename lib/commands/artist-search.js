'use strict';

const { cl, setToken, clientCredentialsGrant, spotifyApi, showError } = require('../utils/utils.js');
const {red, cyan, grey, white} = require('chalk');
const fetch = require('node-fetch');
const cheerio = require('cheerio');


let processDataArtist = (data, params) => {

    let ad = params.artistData;

    if(data.body.artists.items.length === 0){
        showError('Cero result with that entry');
    }

    let artist = data.body.artists.items[0];

   // let albums = params.albumsTitle.map((item, pos) => `\t${pos +1}.  ${item}\n`);

   const bandTemplate = `
   ${cyan(`'${artist.name.toUpperCase()}'`)}


    Origin: ${cyan(ad.birtPlace)}
    Members: ${cyan(ad.birtPlace)}
    Genres: ${cyan(ad.genres)}
    Albums: ${cyan(ad.birthPlace)}
    Id: ${cyan(artist.id)}
    Followers: ${cyan(artist.followers.total)}
    Popularity: ${cyan(artist.popularity)}


    ${grey('Source: Wikipedia, Spotify')}`;

    let isDied = (ad.deadDate)? `${cyan(ad.deadDate)}` : `Age: ${cyan(ad.age)}`;

   const singerTemplate = `
       ${cyan(`'${artist.name.toUpperCase()}'`)}

        Name: ${cyan(ad.artistName)}
        Born date: ${cyan(ad.bornDate)}
        ${isDied}
        Origin: ${cyan(ad.birthPlace)}
        Occupation: ${cyan(ad.occupation)}
        Genres: ${cyan(ad.genres)}
        Id: ${cyan(artist.id)}
        Followers: ${cyan(artist.followers.total)}
        Popularity: ${cyan(artist.popularity)}


        ${grey('Source: Wikipedia, Spotify')}`;

    cl(singerTemplate) 
}


const showArtist = (artist, params) => spotifyApi.searchArtists(artist).then( artist => processDataArtist(artist, params), showError);
    
const getOriginArtist  = (res, params) => {
    const $ = cheerio.load(res);

    const dataBorn = $('th:contains("Born") + td');
    const birthName = $('th:contains("Birth name") + td').text();
    const birthPlace = $('.birthplace').text();
    const dataOrigin = $('th:contains("Origin") + td');
    const dataDied = $('th:contains("Died") + td'); 
    const dataOccupation = $('th:contains("Occupation") + td');
    const dataGenres = $('th:contains("Genres") + td');

    let dataMembers = $('th:contains("embers") + td ul li'); // wikipedia The national
    let dataMembers2 = $('th:contains("embers") + td'); // wikipedia The national
    //let albums = $('#Discography').parent().next().next().text(); //wikipedia SFA
    let albums = $(':contains("Studio albums")').parent().next().find('i'); //wikipedia The Divine Comedy

    var st = $('span.st').eq(0).text();


    if(dataBorn.length > 0) { // no es una banda
        let originSinger = Object.entries(dataBorn)[0][1]; // seleccionamos solo el objeto TD
        let originTags = originSinger.children.filter( tag => tag.name !== 'br');

        const setBirthName = () => {
            let artistName = birthName;
            
            if(birthName.length === 0) {
                artistName = originTags.filter( tag => tag.name === 'div' && tag.attribs.class === 'nickname')[0]['children'][0]['data']
            }

            return artistName;
        }

        const setBirthPlace = () => {
            let artistBirthPlace = birthPlace;

            if(birthPlace.length === 0) {
                artistBirthPlace = originTags.filter( tag => tag.name ==='a')[0];
                var cityAndState = artistBirthPlace['attribs']['title'];

                if(artistBirthPlace.next !== null) {
                    var country = artistBirthPlace.next.data.split(', ')[1]
                }

                return [cityAndState, country].join(', ')
            }
            return artistBirthPlace;
        } 

        const setBornDate = () => originTags.filter( tag => tag.type === 'text')[0]['data'];


        Array.prototype.devuelvo = function() {
            return [this[0].attribs.title, this[0].next.data];
        }

        Array.prototype.debug = function() {
            console.log(this);
            process.exit(0);
        };

        Array.prototype.check = function() {
            if(this[0].name === 'span'){
                return this;
            }
            else {
                return this.filter( tag => tag.name === 'div')
            }
        };


        let artistData = {
            'bornDate': setBornDate(),
            'artistName': setBirthName(),
            'birthPlace': setBirthPlace()
        };

        if(dataOccupation.length > 0) {
            let occupationSinger = Object.entries(dataOccupation)[0][1] // seleccionamos solo el objeto TD
                    .children
                    .filter( tag => tag.name !== 'br')
                    .filter( tag => tag.name === 'div')[0]['children']
                    .filter( tag => tag.name === 'ul')[0]['children'] //div: "tag.name === 'div')[0]" -> ul: "['children'][0]" -> li: "['children']"
                    .filter( tag => tag.name === 'li')
                    .map( it => {
                        if( it.children[0].type === 'text' ) {
                            return it.children[0].data 
                        }
                        else {
                            return it.children[0].children[0].data 
                        }

                    })
                    .join(', ');

            artistData.occupation = occupationSinger;
        }

    if (dataGenres.length > 0) {

        let genresArtist = dataGenres.text().split('\n');

        Array.prototype.checkTag = function() {
            if(this[0].name === 'a'){
                return this.filter( tag => tag.name === 'a');
            }
            else {
                return this.filter( tag => tag.name === 'div')[0]['children']
                            .filter( tag => tag.name === 'ul')[0]['children'] //div: "tag.name === 'div')[0]" -> ul: "['children'][0]" -> li: "['children']"
                            .filter( tag => tag.name === 'li');
            }
        };
    
        if (genresArtist.length > 1) {
            artistData.genres = genresArtist.filter(genre => genre !== '').join(', ');
        }
        else {
            let genresSinger = Object.entries(dataGenres)[0][1] // seleccionamos solo el objeto TD
                .children
                .filter( tag => tag.name !== 'br')
                .checkTag()
                .map( it => {
                    if( it.children[0].type === 'text' ) {
                        return it.children[0].data;
                    }
                    else {
                        return it.children[0].children[0].data 
                    }

                })
                .join(', ');
            
            artistData.genres = genresSinger;
        }
    }



        if(dataDied.length > 0) {
            let deadSinger = Object.entries(dataDied)[0][1]
                    .children
                    .filter( tag => tag.name !== 'br')
                    .filter( tag => tag.type === 'text')[0]['data'];

            artistData.deadDate = `${white('Dead Date:')} ${deadSinger}`;
        }
        else {
             artistData.age = $('.noprint.ForceAgeToShow').text().match(/\d+/g);
        }

        return {artistData};
    }

    else {
        let originBand = Object.entries(dataOrigin)            
        .map(it => it[1])
        .filter(it => typeof it === 'object')
        .filter(tag => tag.type === 'tag' || tag.name === 'td')[0]
        .children.filter(it => it.name !== 'br')
        .map(it => {
            if(it.type ==='tag' && it.name === 'a') return it.children[0].data;
            return it.data;
        })
        .join('')

    let membersBandSpecial = Object.entries(dataMembers)            
        .map(it => it[1])
        .filter(it => typeof it === 'object')
        .filter(tag => tag.type === 'tag' && tag.name === 'li')
        .map(it => it.children[0].children[0].data)
        .join(', ');

    let membersBand2 = Object.entries(dataMembers2)            
            .map(it => it[1])
            .filter(it => typeof it === 'object')
            .filter(tag => tag.type === 'tag' || tag.name === 'td')[0]
            .children.filter(it => it.name !== 'br')
            .map(it => {
                if(it.type ==='tag' && it.name === 'a') return it.children[0].data;
                return it.data;
            })
            .join(', ');
        
    console.log(membersBand2.length)

    let membersBand = Object.entries(dataMembers)            
            .map(it => it[1])
            .filter(it => typeof it === 'object')
            .filter(tag => tag.type === 'tag' && tag.name ==='a')
            .map(i_tag => i_tag.attribs.title)
            .filter(name => name !== undefined)
            .join(', ');
            

    let albumsTitle = Object.entries(albums)
        .map(it => it[1])
        .filter(it => typeof it === 'object')
        .filter(tag => tag.type === 'tag' && tag.name ==='i')
        .map(i_tag => i_tag.children[0].attribs.title);
    

    return {originBand, membersBand2, membersBandSpecial, membersBand, albumsTitle};
    }





}
    
    const getText = res => res.text()
    
    const checkPageArtist = res => {
      if (!res.ok) {
        const err = new Error(`Bad response fetching page: ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res;
    }


module.exports = params => {

        let artist = params.subcommands[0];
        let urlArtist = `https://en.wikipedia.org/wiki/${artist}`; //`https://www.google.com/search?q=${artist}` 
        let urlSinger = `https://en.wikipedia.org/wiki/${artist}_(singer)`
        let urlBand = `https://en.wikipedia.org/wiki/${artist}_(band)`

        clientCredentialsGrant()
            .then(token => setToken(token))
            .then(fetch(urlArtist)
            .then(checkPageArtist)
            .then( getText )
            .then(res => getOriginArtist(res, params))
            .then((data) => showArtist(artist, data))
        );
}
