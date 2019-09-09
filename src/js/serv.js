const torrentStream = require('torrent-stream');
const fastify = require('fastify')();
const util = require('util');


module.exports = (port) => {
    let engine, track;
    fastify.get('/trackerStream', async (request, response) => {
        const { trackPath, magnet } = request.query;
        const filePathTorr = trackPath.split(' || ').join('\\');
        const filePathTorrLinux = trackPath.split(' || ').join('/');

        if (engine) engine.destroy();

        engine = torrentStream(magnet);

        engine.on('error', (err) => console.log(err));
        await util.promisify(engine.on('ready'));
        track = engine.files.find(x => {
            return x.path === filePathTorr
                || x.path === filePathTorrLinux;
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

    const start = async () => {
        try {
            await fastify.listen(port);
            console.log(`server listening on ${fastify.server.address().port}`);
        } catch (err) {
            console.error(err);
        }
    }
    start()
}