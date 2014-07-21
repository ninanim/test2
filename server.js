var io = require('socket.io').listen(80);
var http = require("http");
var fs = require('fs');

fs.readFile('bingoGame.html', function(err, html){
	if(err){
		throw err;
	}

	http.createServer(function(request, response) {
  		response.writeHead(200, {"Content-Type": "text/html"});
  		response.write(html);
  		response.end();
	}).listen(8888)

	var clients = {};
	var playerNames = {};
	var players = [];
	var readyPlayers = [];

	var winner;
	//var readyCount = 0;
	var c = -1;
	var startFlag = false;
	
	var inputNum = 0;
	var userNum = 0;
	io.sockets.on('connection', function(socket){

		console.log('player connection!');
		clients[socket.id] = socket;
		players.push(socket.id);

		if(players.length == 1){
			socket.emit('first user', 'first user');
		} else {
			socket.emit('other user', 'other user');
			if(userNum!=0){
				if(players.length <= userNum){
					socket.emit('insert table', {'inputNum' : inputNum, 'userNum' : userNum, 'startFlag' : startFlag});
				} else {
					socket.emit('ready invalid', 'ready invalid');
				}
			}
		}

		socket.on('create room', function(data){
			console.log('receive create room');
			inputNum = data['inputNum'];
			userNum = data['userNum'];

			for(var i=0; i<players.length; i++){
				if(i<userNum){
					clients[players[i]].emit('insert table',{'inputNum' : inputNum, 'userNum' : userNum});
				} else {
					clients[players[i]].emit('ready invalid', 'ready invalid');
				}
			}			
		});

		socket.on('ready alert', function(data){


			clients[socket.id] = socket;
			readyPlayers.push(socket.id);
			console.log(data);
			playerNames[socket.id] = data.name;



			for(var i=0; i<readyPlayers.length; i++){

				clients[readyPlayers[i]].emit('ready click', {'userNum':userNum, 'readyCount':readyPlayers.length});
			}

			console.log('ready clicked!!!!!!!' + readyPlayers.length);
			if(readyPlayers.length == userNum){
				c = 0;
				startFlag = true;
				clients[readyPlayers[0]].emit("ready alert",{turn:"you",who:playerNames[readyPlayers[0]]});
				for(var i=1; i<readyPlayers.length; i++){
					clients[readyPlayers[i]].emit("ready alert",{turn:"Not you",who:playerNames[readyPlayers[0]]});
				}

			}
		});


		socket.on('click', function(data){
			socket.broadcast.emit('opposite click', data);
			for (var i=0; i<readyPlayers.length; i++){
				if(readyPlayers[i] == socket.id){
					c = i+1;
				}		
			}
			if(c==readyPlayers.length){
				c=0;
			}
			for (var i=0; i<readyPlayers.length; i++){
				if(i==c){
					clients[readyPlayers[i]].emit("ready alert",{turn:"you",who:playerNames[readyPlayers[c]]});
				} else {
					clients[readyPlayers[i]].emit("ready alert", {turn:"Not you",who:playerNames[readyPlayers[c]]});
				}		
			}
			
		})

		function resetOrder(currentOrder){
			if(currentOrder==readyPlayers.length){
				c=0;
			}
			for (var i=0; i<readyPlayers.length; i++){
				if(i==c){
					clients[readyPlayers[i]].emit("ready alert", "you");
				} else {
					clients[readyPlayers[i]].emit("ready alert", "Not you");
				}		
			}
		}

		socket.on('game end', function(data){
			winner= socket;
			for(var i=0; i<readyPlayers.length; i++){
				if(clients[readyPlayers[i]]!=winner){
					clients[readyPlayers[i]].emit('game end', data);
				}
			}
			startFlag = false;
			clients[readyPlayers[0]].emit('reset', {'userNum':userNum, 'inputNum' : inputNum});
		})

		socket.on('disconnect', function(){
			console.log('player disconnection!');
			for(var i=0; i<players.length; i++){
				if(i==0 && clients[players[i]]==socket){
					players.splice(i, 1);
					for(var j=0; j<readyPlayers.length; j++){
						if(clients[readyPlayers[j]]==socket){
							readyPlayers.splice(j,1);
							for(var k=0; k<readyPlayers.length; k++){
								clients[readyPlayers[k]].emit('ready click', {'userNum':userNum, 'readyCount':readyPlayers.length});
							}
							if(c == j){ //disconnection when the user has turn!!
								resetOrder(j);
							}							
						}						
					}
					if(!startFlag){
						inputNum = 0;
						userNum = 0;
						readyPlayers = [];
					}
					if(players.length!=0 && !startFlag){
						clients[players[i]].emit('first user', 'first user');
						for(var l=1; l<players.length; l++){
							clients[players[l]].emit('other user', 'other user');
						}					
					}
				} else if(clients[players[i]]==socket) {
					players.splice(i, 1);
					for(var j=0; j<readyPlayers.length; j++){
						if(clients[readyPlayers[j]]==socket){
							readyPlayers.splice(j,1);
							for(var k=0; k<readyPlayers.length; k++){
								clients[readyPlayers[k]].emit('ready click', {'userNum':userNum, 'readyCount':readyPlayers.length});
							}		
							if(c == j){ //disconnection when the user has turn!!
								resetOrder(j);
							}		
						}						
					}
					if(userNum!=0 && clients[players[userNum-1]]!=null && !startFlag){
						clients[players[userNum-1]].emit('insert table', {'inputNum' : inputNum, 'userNum' : userNum, 'startFlag' : startFlag});
					}					
				}				
			}
		})

		socket.on('restart', function(){
			for(var i=0; i<readyPlayers.length; i++){
				clients[readyPlayers[i]].emit('insert table', {'inputNum' : inputNum, 'userNum' : userNum});
			}
			if(readyPlayers.length<userNum && players.length>readyPlayers.length ){
				for(var i=0; i<userNum-readyPlayers.length; i++){
					clients[players[i+readyPlayers.length]].emit('insert table', {'inputNum' : inputNum, 'userNum' : userNum, 'readyCount':0});
				}
			}			
			readyPlayers = [];
			
		})	
	})
});
