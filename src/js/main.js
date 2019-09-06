const PirateBay = require('thepiratebay');
const torrentStream = require('torrent-stream');
const fastify = require('fastify')();


const RuTracker = require('./js/rutracker.js');
const fs = require('fs');

const port = 3007;

document
    .querySelector('#searchSubmit')
    .addEventListener('click', async () => {
        const searchStr = document.querySelector('#searchStr').value.toLowerCase();
        try {
            /* const result = await PirateBay.search(document.querySelector('#searchStr').value, {
                category: 'audio'
            });

            console.log(result); */

            const result = await RuTracker.Search(searchStr);
            const items = result.playlist.map(x => `<div class="searchItem" onClick="listTracks('${x.permalink_url}')">${x.title}</div>`);

            document.querySelector('#searchOutput').innerHTML = items.join('');
            console.log(result);
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
    document.querySelector('#audioOutput').src = `http://localhost:${port}/trackerStream?trackPath=${trackPath}&magnet=${encodeURIComponent(magnet)}`;
}


let engine, track;
fastify.get('/trackerStream', async (request, response) => {
    const { trackPath, magnet } = request.query;
    const filePathTorr = trackPath.split(' || ').join('\\');
    const filePathTorrLinux = trackPath.split(' || ').join('/');

    if (engine) engine.destroy();

    engine = torrentStream(magnet);
    track = await new Promise((resolve) => {
        engine.on('ready', () => {
            resolve(engine.files.find(x => {
                return x.path === filePathTorr
                    || x.path === filePathTorrLinux;
            }));
        });
        engine.on('error', (err) => console.log(err));
    });



    const total = track.length;
    const range = request.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const partialstart = parts[0];
        const partialend = parts[1];

        const start = parseInt(partialstart, 10);
        const end = partialend ? parseInt(partialend, 10) : total - 1;
        const chunksize = (end - start) + 1;

        response
            .code(206)
            .header('Content-Range', 'bytes ' + start + '-' + end + '/' + total)
            .header('Accept-Ranges', 'bytes')
            .header('Content-Length', chunksize)
            .header('Content-Type', 'audio/mpeg')
            .send(track
                .createReadStream({ start, end })
                .on('end', () => {
                    console.log('Downloaded');
                    engine.destroy();
                }));
    } else {
        response
            .header('Content-Type', 'audio/mpeg')
            .send(track.createReadStream());
    }
})

// Run the server!
const start = async () => {
    try {
        await fastify.listen(port);
        console.log(`server listening on ${fastify.server.address().port}`);
    } catch (err) {
        console.error(err);
    }
}
start()