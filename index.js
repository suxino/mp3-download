const YoutubeMp3Downloader = require("youtube-mp3-downloader");

const YD = new YoutubeMp3Downloader({
    "ffmpegPath": "/usr/local/Cellar/ffmpeg/5.1.2/bin/ffmpeg",
    "outputPath": "./output",
    "youtubeVideoQuality": "highestaudio",
    "queueParallelism": 40,
    "progressTimeout": 2000
});

/**
 * @param {YoutubeMp3Downloader.IVideoTask} param
 * @return {string}
 */
const parseProgress = ({videoId, progress}) => {
    const percentage = progress.percentage.toFixed(2)
    return `Video ID: ${videoId} - Downloaded: ${percentage}% - Runtime: ${progress.runtime}s`
}

YD.on("progress", (progress) => {
    console.log(parseProgress(progress));
});

YD.on("error", (error, data) => {
    console.error(error, data)
})

YD.on("queueSize", (total) => {
    console.log(`Queue size changed. New total - ${total}`)
})

const lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('url.txt')
});

lineReader.on('line', (line) => {
    YD.download(new URL(line).searchParams.get('v'))
});
