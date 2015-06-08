var myApp = angular.module('myApp', ['ngAnimate']);
myApp.controller('CountDownCtrl', ['$scope', '$timeout', '$http', '$interval',  function($scope, $timeout, $http, $interval) {


    var getData = function () {         
        $http.get('/data.json').success(function(data){
            $scope.poll = data;
            $scope.dataReceivedTime = Date.now();
        });
    }

    var updateTimer = function () {         
        $scope.timeleft = $scope.poll.msUntilNextGame + $scope.dataReceivedTime - Date.now();
    }

    var  updateTimerinterval = $interval(updateTimer,33);

    var getDataInterval = $interval(getData,2000);

    $scope.Math = window.Math;


    $scope.messages = ['Vote for the next game! Type a number in chat to vote.', 'Follow us on Twitter, we tweet every game! @TASAttack ', 'Have a suggestion? Send a message to TASAttack on Twitch!']

    $scope.messageNumber = 0;
    $scope.message = $scope.messages[$scope.messageNumber];

    $scope.showMessage= true;

    var changeMessage = function () {  

        $scope.showMessage = !$scope.showMessage;


        $timeout(function() {
            $scope.messageNumber +=1 ;
            if ($scope.messageNumber  == $scope.messages.length ){
                $scope.messageNumber = 0;
            }
            $scope.message = $scope.messages[$scope.messageNumber];
            $scope.showMessage= true;
        }, 900);


    }


    var  messageTimerinterval = $interval(changeMessage,20000);



}]);

