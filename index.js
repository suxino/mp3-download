const YoutubeMp3Downloader = require("youtube-mp3-downloader");

const YD = new YoutubeMp3Downloader({
    "ffmpegPath": "/usr/local/Cellar/ffmpeg/4.3.1_9/bin/ffmpeg",
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
   YD.download(new URL(line).searchParams.get('v'))
});
