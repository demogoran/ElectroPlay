
const torrentStream = require('torrent-stream');
const RutrackerAPI = require('rutracker-api-2');
const pRequest = require('request-promise');
const cheerio = require('cheerio');

const rutracker = new RutrackerAPI();

let trackerCookie;
const RUTRACKER_LOGIN = "searchertrack",
    RUTRACKER_PASSWORD = "1q1Q1q1Q";

(async ()=>{
    trackerCookie = await rutracker.login(RUTRACKER_LOGIN, RUTRACKER_PASSWORD);
})();

const getTrackerMP3List = (html, magnetHTML) => {
    const $ = cheerio.load(html);
    const $m = cheerio.load(magnetHTML);
    const elem = $('.ftree');
    const magnet = $m('[class*="magnet-link-"]').attr('href')
    const result = Array.from($elem.find('b:contains(.mp3)')).map((x, i) => {
        const title = $(x).text();
        const $dir = $(x).parents('.dir');
        const pathParts = Array.from($dir).map(x => $(x).find('>div b').text().replace('./', '')).reverse();
        pathParts.push(title);

        const resultPath = pathParts.join(' || ');
        return {
            id: `${Date.now()}${i}`,
            trackPath: resultPath,
            shortname: title,
            title: resultPath,
            isTracker: true,
            magnet,
        };
    });

    return result;
};

module.exports = {
    TrackerFiles: async (url) => {
        const id = url.replace('http://rutracker.org/forum/viewtopic.php?t=', '');

        const magnetHTML = await pRequest(url, {
            headers: {
                cookie: trackerCookie,
            },
        });

        const html = await pRequest('https://rutracker.org/forum/viewtorrent.php', {
            method: "POST",
            headers: {
                cookie: trackerCookie,
            },
            form: {
                t: id
            }
        });
        const result = getTrackerMP3List(html, magnetHTML);
        return result;
    },
    Search: async (str) => {
        const data = await rutracker.search(str, 'size', false);
        return {
            playlist: data
                .filter(x => x.title.toLowerCase().indexOf('mp3') > -1)
                .map(x => ({
                    permalink_url: x.url,
                    title: x.title || "NO_TITLE",
                    id: x.id,
                    type: 'tracker',
                })),
            user: [],
            track: []
        };
    }
};