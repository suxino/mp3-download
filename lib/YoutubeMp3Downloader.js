/*
The MIT License (MIT)

Copyright (c) 2015 TobiLG

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
"use strict";
let os = require("os");
let util = require("util");
let EventEmitter = require("events").EventEmitter;
let ffmpeg = require("fluent-ffmpeg");
let ytdl = require("ytdl-core");
let async = require("async");
let progress = require("progress-stream");
let sanitize = require("sanitize-filename");

function YoutubeMp3Downloader(options) {

    let self = this;

    self.youtubeBaseUrl = "http://www.youtube.com/watch?v=";
    self.youtubeVideoQuality = (options && options.youtubeVideoQuality ? options.youtubeVideoQuality : "highest");
    self.outputPath = (options && options.outputPath ? options.outputPath : (os.platform() === "win32" ? "C:/Windows/Temp" : "/tmp"));
    self.queueParallelism = (options && options.queueParallelism ? options.queueParallelism : 1);
    self.progressTimeout = (options && options.progressTimeout ? options.progressTimeout : 1000);
    self.fileNameReplacements = [[/"/g, ""], [/\|/g, ""], [/'/g, ""], [/\//g, ""], [/\?/g, ""], [/:/g, ""], [/;/g, ""]];
    self.requestOptions = (options && options.requestOptions ? options.requestOptions : { maxRedirects: 5 });
    self.outputOptions = (options && options.outputOptions ? options.outputOptions : []);

    if (options && options.ffmpegPath) {
        ffmpeg.setFfmpegPath(options.ffmpegPath);
    }

    self.downloadQueue = async.queue(function (task, callback) {

        self.emit("queueSize", self.downloadQueue.running() + self.downloadQueue.length());

        self.performDownload(task, function(err, result) {
            callback(err, result);
        });

    }, self.queueParallelism);

}

util.inherits(YoutubeMp3Downloader, EventEmitter);

YoutubeMp3Downloader.prototype.cleanFileName = function(fileName) {
    let self = this;

    self.fileNameReplacements.forEach(function(replacement) {
        fileName = fileName.replace(replacement[0], replacement[1]);
    });

    return fileName;
};

YoutubeMp3Downloader.prototype.download = function(videoId, fileName) {

    let self = this;
    let task = {
        videoId: videoId,
        fileName: fileName
    };

    self.downloadQueue.push(task, function (err, data) {

        self.emit("queueSize", self.downloadQueue.running() + self.downloadQueue.length());

        if (err) {
            self.emit("error", err, data);
        } else {
            self.emit("finished", err, data);
        }
    });

};

YoutubeMp3Downloader.prototype.performDownload = function(task, callback) {

    let self = this;
    let videoUrl = self.youtubeBaseUrl+task.videoId;
    let resultObj = {
        videoId: task.videoId
    };

    ytdl.getInfo(videoUrl, function(err, info){

        if (err) {
            callback(err.message, resultObj);
        } else {

            let videoTitle = self.cleanFileName(info.player_response.videoDetails.title);
            let artist = "Unknown";
            let title = "Unknown";

            if (videoTitle.indexOf("-") > -1) {
                let temp = videoTitle.split("-");
                if (temp.length === 2) {
                    artist = temp[0].trim();
                    title = temp[1].trim();
                } else if (temp.length > 2) {
                    artist = temp[0].trim();
                    temp.shift();
                    title = temp.join(' ').trim()
                }
            } else {
                title = videoTitle;
            }

            //Derive file name, if given, use it, if not, from video title
            let fileName = (task.fileName ? self.outputPath + "/" + task.fileName : self.outputPath + "/" + (sanitize(videoTitle) || info.video_id) + ".mp3");

            ytdl.getInfo(videoUrl, { quality: self.youtubeVideoQuality }, function(err, info) {

                //Stream setup
                let stream = ytdl.downloadFromInfo(info, {
                    quality: self.youtubeVideoQuality,
                    requestOptions: self.requestOptions
                });

                stream.on("response", function(httpResponse) {

                    //Setup of progress module
                    let str = progress({
                        length: parseInt(httpResponse.headers["content-length"]),
                        time: self.progressTimeout
                    });

                    //Add progress event listener
                    str.on("progress", function(progress) {
                        if (progress.percentage === 100) {
                            resultObj.stats= {
                                transferredBytes: progress.transferred,
                                runtime: progress.runtime,
                                averageSpeed: parseFloat(progress.speed.toFixed(2))
                            }
                        }
                        self.emit("progress", {videoId: task.videoId, progress: progress, fileName: fileName})
                    });

                    //Start encoding
                    new ffmpeg({
                        source: stream.pipe(str)
                    })
                    .audioBitrate(256)
                    .withAudioCodec("libmp3lame")
                    .toFormat("mp3")
                    .outputOptions('-id3v2_version 4')
                    .outputOptions('-metadata', `title=${title}`)
                    .outputOptions('-metadata', `artist=${artist}`)
                    .on("error", function(err) {
                        callback(err.message, null);
                    })
                    .on("end", function() {
                        resultObj.file =  fileName;
                        resultObj.youtubeUrl = videoUrl;
                        resultObj.videoTitle = videoTitle;
                        resultObj.artist = artist;
                        resultObj.title = title;
                        callback(null, resultObj);
                    })
                    .saveToFile(fileName);

                });

            });
        }

    });
};

module.exports = YoutubeMp3Downloader;
