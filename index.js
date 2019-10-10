const YoutubeMp3Downloader = require("./lib/YoutubeMp3Downloader");
const url = require('url');

const YD = new YoutubeMp3Downloader({
    "ffmpegPath": "/usr/local/Cellar/ffmpeg/4.2.1/bin/ffmpeg",
    "outputPath": "./output",
    "youtubeVideoQuality": "highest",
    "queueParallelism": 40,
    "progressTimeout": 2000
});

YD.on("progress", function(progress) {
    console.log(JSON.stringify(progress));
});

const lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('url.txt')
});

lineReader.on('line', (line) => {
    const videoId = url.parse(line, true).query.v;
    YD.download(videoId)
});
