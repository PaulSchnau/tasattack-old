require('shelljs/global');


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

restartStream(){
    console.log('hi');
    var windowsId = exec('xdotool search --onlyvisible --name SimpleScreenRecorder windowkill').output;

    var newWindowsId = exec('xdotool search --onlyvisible --name SimpleScreenRecorder').output;
    var newWindowId = newWindowsId.substring(0, newWindowsId.indexOf('\n'));
    var restart = exec('simplescreenrecorder', {async:true}).output;



    setTimeout(function() {
        var activeWindow = exec('xdotool windowactivate --sync'+ newWindowId).output;
        var continue1 = exec('xdotool key Tab Tab Tab space').output;
        var continue2 = exec('xdotool key Tab space'+ newWindowId).output;
        var continue3 = exec('xdotool key Tab space'+ newWindowId).output;
        var continue3 = exec('xdotool key space'+ newWindowId).output;
    }, 5000);

}

setInterval(checkStream, 30*1000);