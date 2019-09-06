const RuTracker = require('./js/rutracker.js');
const fs = require('fs');

const port = 3007;
require('./js/serv.js')(port);

document
    .querySelector('#searchSubmit')
    .addEventListener('click', async () => {
        const searchStr = document.querySelector('#searchStr').value.toLowerCase();
        try {
            const result = await RuTracker.Search(searchStr);
            const items = result
                .playlist
                .map(x => `<div class="searchItem" onClick="listTracks('${x.permalink_url}')">${x.title}</div>`);

            document.querySelector('#searchOutput').innerHTML = items.join('');
        }
        catch (ex) {
            console.error(ex);
        }
    });

const listTracks = async (url) => {
    const tracks = await RuTracker.TrackerFiles(url);
    const items = tracks.map(x => `<div class="searchItem" onClick="playTrack(\`${x.trackPath}\`, '${x.magnet}')">${x.title}</div>`);

    document.querySelector('#searchOutput').innerHTML = items.join('');
    console.log(tracks);
}

const playTrack = async (trackPath, magnet) => {
    document.querySelector('#audioOutput').src
        = `http://localhost:${port}/trackerStream?trackPath=${trackPath}&magnet=${encodeURIComponent(magnet)}`;
}

