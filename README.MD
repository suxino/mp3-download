# suxino-mp3-download

## How to use

1. Create url.txt file in root of the project
2. Put YouTube links into the file (one link per line)
3. Run the script. MP3's will be downloaded into output folder

## Config

You can configure the output folder or how many videos can be downloaded in parallel.
For the whole config docs visit [youtube-mp3-downloader](https://www.npmjs.com/package/youtube-mp3-downloader)

```javascript
const YD = new YoutubeMp3Downloader({
    "ffmpegPath": pathToFfmpeg,
    "outputPath": "./output",
    "youtubeVideoQuality": "highestaudio",
    "queueParallelism": 40,
    "progressTimeout": 2000
});
```