var fs = require('fs');
var request = require('request');
var vlc = require('vlc')([
    '-I', 'dummy',
    '--verbose', '1',
    '--no-video-title-show',
    '--fullscreen',
    '--no-snapshot-preview']);
require('shelljs/global');
var childProcess = require('child_process');
var snesVideos;
var gbaVideos;
var player = vlc.mediaplayer;
var poller;
var twitchToken = '4wacdn0qa0euip0r0x6gq0ea3o4go7';
var gameNumber =100;
var poll;
var polloptions;
var minsUntilNextGame;
var media;
var currentGame;
var currentRunner;
var currentRunLength;
var currentRunCatagory;

var Twit = require('twit')

var T = new Twit({
    consumer_key:         'MZUpNj9RjRI2ROrSwcidKFpqr'
    , consumer_secret:      'vfY1NoId4OnGWEra4VRDDWwuAsUjUYSoSHCgJNMNxviPrrTPzq'
    , access_token:         '2907108071-2pCrbGgHak3ev7E1qJwy1i2py9ag6kxvtCB1VYP'
    , access_token_secret:  'd9R9DQSOhKVaNeEUpZk1IArwUjOQYdywSFH4itO5gdZNn'
});


function setGame(videoString){
    currentTitle = makeReadable(videoString);
    currentGame = gameNameOnly(videoString);
    currentRunner = getRunnerName(videoString);
    currentRunLength = getRunTime(videoString);
    currentRunCatagory = getRunCatagory(videoString);
    console.log('Run Changed to '+ currentGame);
    //var twitchTitle = videoString.substring(videoString.indexOf(" ")+1,videoString.indexOf(".")-1);
    //twitchTitle = twitchTitle.replace(/_/g, ":");
    //var name=videoString.substring(videoString.indexOf(" ")+1,videoString.indexOf("(")-1);
    //name = name.replace(/_/g, ":");
    //name = name.replace(/\s{2,}/g, ' ');
    getSuggestions(currentGame);

    // Regex Removes multispaces
    var twitterString = (currentGame + ' ' + currentRunCatagory + ' in ' + currentRunLength + ' by ' + currentRunner + ' twitch.tv/tasattack').replace(/ +(?= )/g,''); 
    console.log('Posting twitter: ' + twitterString);

    T.post('statuses/update', { status: twitterString}, function(err, data, response) {
        //console.log(data);
        console.log(err);
    })
}

function getSuggestions(gameOnly){
    request('https://api.twitch.tv/kraken/search/games?type=suggest&q=' + gameOnly, function (error, response, body) {
        var results = JSON.parse(body);
        if (results['games'][0]) {
            gameName = results['games'][0]['name'];
            changeTwitchGame(gameName);
        } else getSuggestions(gameOnly.slice(0, -1));
    }); 
}

function changeTwitchGame(game){
    console.log("changing game to: " + game);
    request.put('https://api.twitch.tv/kraken/channels/tasattack?&channel[game]=' + game +' &oauth_token=' + twitchToken, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var results = JSON.parse(body);
            console.log('Successfully changed game to: '+ results.game);
        } else {
            console.log('Error changing game');
            console.log(results);
            changeTwitchGame(game.slice(0,-1));
        } });
}

function playVideo (path) {
    media = vlc.mediaFromFile(path);
    media.parseSync();
    player.media = media;
    console.log(media.title);
    console.log('Media duration:', media.duration);
    player.play();
}

function startChatBot(){
    console.log('starting chat bot');
    var irc = require('twitch-irc');
    var client = new irc.client({
        options: {
            debug: true,
            debugIgnore: ['ping', 'chat', 'action'],
            logging: false,
            tc: 3
        },
        identity: {
            username: 'tasattack',
            password: 'oauth:' + twitchToken
        },
        channels: ['tasattack']
    });
    client.connect();
    client.addListener('chat', function (channel, user, message) {
        if (poll.voters.indexOf(user.username) <= -1){
            if (message == '1') {
                //client.say(channel, 'Thanks for the vote, ' + user.username);
                poll.games[0].votes =  poll.games[0].votes + 1;
                poll.voters.push(user.username);
                poll.totalVotes += 1;
                if  (poll.games[0].votes > poll.maxVotes){  poll.maxVotes = poll.games[0].votes;}
            }
            if (message == '2') {
                //client.say(channel, 'Thanks for the vote, ' + user.username);
                poll.games[1].votes =  poll.games[1].votes + 1;
                poll.voters.push(user.username);
                poll.totalVotes += 1;
                if  (poll.games[1].votes > poll.maxVotes){   poll.maxVotes = poll.games[1].votes;}
            }
            if (message == '3') {
                //client.say(channel, 'Thanks for the vote, ' + user.username);
                poll.games[2].votes =  poll.games[2].votes + 1;
                poll.voters.push(user.username);
                poll.totalVotes += 1;
                if  (poll.games[2].votes > poll.maxVotes){   poll.maxVotes = poll.games[2].votes;}
            }

        }
        if (poll.votersToSkip.indexOf(user.username) <= -1){
            if (message == 'skip' && media.duration * player.position > 60000) {
                //client.say(channel, 'Thanks for the vote to skip, ' + user.username);
                poll.skip = poll.skip + 1;
                poll.votersToSkip.push(user.username);
            }
        }

    });
}

function nextGamePoll(){
    poll = {};
    poll.title = currentTitle;
    poll.currentRunner = currentRunner;
    poll.currentRunLength = currentRunLength;
    poll.currentGame = currentGame;
    poll.currentRunCatagory = currentRunCatagory;
    poll.games = [];
    poll.voters = [];
    poll.votersToSkip = [];
    poll.totalVotes = 0;
    poll.skip = 0;
    poll.maxVotes = 0;
    polloptions = [];
    while(polloptions.length < 3){
        var randomnumber=Math.floor(Math.random()*snesVideos.length)
        var found=false;
        for(var i=0;i<polloptions.length;i++){
            if(polloptions[i]==randomnumber){found=true;break}
        }
        if(!found)polloptions[polloptions.length]=randomnumber;
    }
    createPoll();
}

function createPoll(){
    for (var i = 0; i < polloptions.length; i++) {
        poll.skip = 0;
        var gameOrder = i;
        var gameId = polloptions[i];
        var gameString = snesVideos[gameId];
        var runner = getRunnerName(gameString);
        var runTime = getRunTime(gameString);
        var runCatagory = getRunCatagory(gameString);
        poll.games.push({
            name: gameNameOnly(gameString),
            fullname: makeReadable(gameString),
            id: gameId,
            votes: 0,
            order: gameOrder + 1,
            runner: runner,
            runTime: runTime,
            runCatagory: runCatagory
        });
    }
}

function makeReadable(unreadbleString){
    if (!unreadbleString) return unreadbleString;
    unreadbleString = unreadbleString.substring(0,unreadbleString.lastIndexOf("."));
    unreadbleString = unreadbleString.replace(/_/g, ":");
    return unreadbleString;
}

function gameNameOnly(gamestring){
    if (!gamestring) return gamestring;
    var name = gamestring.substring(gamestring.indexOf(" ")+1,gamestring.indexOf("(")-1);
    name = name.replace(/_/g, ":");
    name = name.replace(/\s{2,}/g, ' ');
    return name;
}

function getRunnerName(gamestring){
    if (!gamestring) return gamestring;
    var name = gamestring.substring(gamestring.indexOf("by")+2,gamestring.lastIndexOf("."));
    return name;
}

function getRunTime(gamestring){
    var name = gamestring.substring(gamestring.indexOf(" in ")+4,gamestring.lastIndexOf(" by "));
    if (!gamestring) return gamestring;
    name = name.replace(/_/g, ":");
    name = name.replace(/\s{2,}/g, ' ');
    return name;
}

function getRunCatagory(gamestring){
    var name = gamestring.substring(gamestring.indexOf(")")+2,gamestring.lastIndexOf(" in "));
    if (!gamestring) return gamestring;
    name = name.replace(/_/g, ":");
    name = name.replace(/\s{2,}/g, ' ');
    return name;
}



function startVideo(){
    fs.readdir('moons', function(err, list) {
        snesVideos = list;
        setGame(snesVideos[gameNumber]);
        playVideo ( 'moons/' + snesVideos[gameNumber]);
        nextGamePoll();
        var gameChanger = setInterval(function () {
            msUntilNextGame = Math.ceil((media.duration - (media.duration * player.position)));
            minsUntilNextGame = (msUntilNextGame/1000/60) << 0,
                secondsUntilNextGame = (msUntilNextGame/1000) % 60;
            secondsUntilNextGame = Math.ceil((media.duration - (media.duration * player.position))/1000);
            minsUntilNextGame = Math.ceil((media.duration - (media.duration * player.position)) / 60000);
            poll.msUntilNextGame = msUntilNextGame;
            
            
            
            if (player.position >= 0.998 || poll.skip >poll.totalVotes / 2 + 1){
                var mostVoted = poll.games[0];
                for (var i = 0; i < poll.games.length; i++) {
                    if (poll.games[i].votes > mostVoted.votes){
                        mostVoted = poll.games[i];
                    }
                }
                try{
                    setGame(snesVideos[mostVoted.id]);
                    playVideo ( 'moons/' + snesVideos[mostVoted.id]);
                    nextGamePoll();
                } catch (err) {}
            }
        }, 100);
    });
}

function startPollDisplay(){
    var express = require('express');
    var jade = require('jade');
    var app = express();
    app.get('/', function (req, res) {
        res.send( jade.renderFile('index.jade', {poll : poll, minsUntilNextGame: minsUntilNextGame}));
    });

    app.get('/display.js', function (req, res) {
        res.sendFile(__dirname + '/display.js');
    });
    app.get('/custom.css', function (req, res) {
        res.sendFile(__dirname + '/custom.css');
    });
    app.get('/data.json', function (req, res) {
        res.send(JSON.stringify(poll));
    });
    var server = app.listen(3000, function () {
        var host = server.address().address
        var port = server.address().port
        console.log('Example app listening at http://%s:%s', host, port)
    });
}

function checkStream(){
    request('https://api.twitch.tv/kraken/streams/tasattack', function (error, response, body) {
        var results = JSON.parse(body);
        if (results['stream']) {
            return
        } else {
            restartStream();
        }
    }
           )
}

function restartStream(){
    console.log('Restarting Stream');
    var windowsId = exec('xdotool search --onlyvisible --name SimpleScreenRecorder windowkill').output;
    //var restart = exec('simplescreenrecorder', {async:true}).output;
    var restart1 = exec('xdotool mousemove --sync 0 0 click 1').output;
    var restart2 = exec('xdotool key --delay 20 s i m p l e s c r e e n Return ').output;

    setTimeout(function() {
        //var newWindowsId = exec('xdotool search --onlyvisible --name SimpleScreenRecorder').output;
        //var newWindowId = newWindowsId.substring(0, newWindowsId.indexOf('\n'));
        var newWindowsId = exec('xdotool getwindowfocus').output.trim();
        console.log(newWindowsId);
        console.log("window id = " + newWindowsId);
        var continue1 = exec('xdotool mousemove --window '+newWindowsId+' 360 550 ' ).output;
        var continue2 = exec('xdotool click --delay 150 --repeat 3 1' ).output;
        var continue3 = exec('xdotool key space' ).output;

        //var continue1 = exec('xdotool key Tab Tab  Tab space').output;
        //var continue2 = exec('xdotool key shift+Tab space'+ newWindowId).output;
        //var continue3 = exec('xdotool key Tab space'+ newWindowId).output;
        //var continue3 = exec('xdotool key space '+ newWindowId).output;

        var minimize = exec('xdotool windowminimize '+ newWindowsId).output;
        var returnMouse = exec('xdotool mousemove 0 0').output;
    }, 2000);

}

function startTwitterBot(){
    console.log('Starting Twitter Bot');


}

function tweetCurrentGame(){

}




startVideo();
startChatBot();
startPollDisplay();

setInterval(checkStream, 120*1000);
restartStream();



