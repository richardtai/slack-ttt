/* Imports */
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Game = require('../models/Game.js');
var GameState = require('../models/GameState.js');

/* Constants */
var NO_ACTIVE_GAME = "There is no ongoing game right now. Start one with the command /ttt [insert player name]!";
var ACTIVE_GAME = "There is an ongoing game!";
var ENTER_VALID_BOARD_POSITION = "Enter a board position 1-9.";
var POSITION_ALREADY_PLAYED = "This space has already been taken!";
var ENDGAME_TIE = "Game over! It's a tie!";
var NEWGAME_IMPROPER_INPUT = "You've got to challenge someone! Confused? Try /usage!";
var HELP = "```Welcome to Tic Tac Toe! Here are your available options:\n\t/ttt [insert username]\tChallenge a user to a game of tic tac toe!\n\t/choose [1-9]\t\t\t Enter a number [1-9] that corresponds to a position on the board to play!\n\t/currentboard\t\t\t Returns the current game and who's turn it is.\n\t/usage\t\t\t\t\tReturns commands and usages.\n```";
var MAX_MOVES = 8;
var EMPTY_SPACE = 0;
var LOWER_BOUNDARY = 1;
var UPPER_BOUNDARY = 9;
var NEWGAME_TOKEN = "LizhEsO1HxQDS5IQY2svHoy0";
var CHOOSE_TOKEN = "8k2Yx7v8AKQMeEVZDppnjeC2";
var CURRENTBOARD_TOKEN = "vYAGnUzQMfxbtunRdO6zWlFi";
var USAGE_TOKEN = "jX61S3SPQNq6A4c5tB0ifSbj";

/* POST */
router.post('/', function(req, res, next) {
	res.send(req.body);
});

router.post('/newgame', function(req, res, next) {
	if (req.body.token !== NEWGAME_TOKEN) {
		return;
	}
	if (req.body.text == null) {
		res.send(NEWGAME_IMPROPER_INPUT);
	}
	var gameStatePromise = GameState.findOne({}).exec();
	gameStatePromise.then(function(gameState) {
		if (gameState == null) {
			gameState = getInitialGameState();
		}
		if (gameState.hasOngoingGame) {
			res.send(ACTIVE_GAME);
		} else {
			var game = createNewGame(req.body.user_name, req.body.text.substring(1));
			var gamePromise = game.save();
			gamePromise.then(function(createdGame) {
				res.json(getInChannelMessage("Game started!\n" + getCurrentBoardAndPlayer(game, gameState)));
				gameState.currentGameId = game.id;
				gameState.hasOngoingGame = true;
				gameState.save();					
			});
		}
	})
	.catch(function (err) {
		console.log("Error: " + err);
	});
});


router.post('/makemove', function(req, res, next) {
	if (req.body.token !== CHOOSE_TOKEN) {
		return;
	}
	var updatePosition = req.body.text;
	if (isNaN(updatePosition) || updatePosition > UPPER_BOUNDARY || updatePosition < LOWER_BOUNDARY) {
		res.send(ENTER_VALID_BOARD_POSITION);
	} else {
		var gameStatePromise = GameState.findOne({}).exec();
		gameStatePromise.then(function(gameState) {
			if (gameState == null) {
				res.send(NO_ACTIVE_GAME);
				return;
			}
			return gameState;
		})
		.then(function(gameState) {
			var gamePromise = Game.findById(gameState.currentGameId).exec();
			gamePromise.then(function(game) {
				if(!isCurrentPlayer(game, gameState.currentPlayer, req.body.user_name)) {
					res.send("It's " + getCurrentPlayerName(game, gameState.currentPlayer) + "'s turn!");
					return;
				}
				var gameBoard = game.boardArray;
				var position = updatePosition - 1;
				if (gameBoard[position] != EMPTY_SPACE) {
					res.send(POSITION_ALREADY_PLAYED);
					return;
				} else {
					game.boardArray.set(position, gameState.currentPlayer + 1);
					game.save();
					if(checkWinner(game.boardArray, position, gameState.currentPlayer + 1)) {
						var victoryString = getInChannelMessage(stringifyBoard(game.boardArray) + "\n\n" + getVictoryString(game, gameState.currentPlayer));
						res.send(victoryString);
						clearAll();
						return;
					} 
					else if (gameState.positionsPlayed === MAX_MOVES) {
						res.json(getInChannelMessage(ENDGAME_TIE));
						clearAll();
						return;
					} else {
						gameState.currentPlayer = gameState.currentPlayer ? 0 : 1;
						var currentStateString = getInChannelMessage(getCurrentBoardAndPlayer(game, gameState));
						res.json(currentStateString);
						gameState.positionsPlayed = gameState.positionsPlayed + 1;
						gameState.save();	
					}
				}					
			})
		})
		.catch(function(err) {
			console.log("Error: " + err);
		});
	}
});

router.post('/help', function(req, res, next) {
	if (req.body.token !== USAGE_TOKEN) {
		return;
	}
	res.send(HELP);
});

router.post('/getboard', function(req, res, next) {
	if (req.body.token !== CURRENTBOARD_TOKEN) {
		return;
	}
	var gameStatePromise = GameState.findOne({}).exec();
	gameStatePromise.then(function(gameState) {
		if (gameState == null) {
			res.send(NO_ACTIVE_GAME);
			return;
		} else {
			return gameState;
		}
	})
	.then (function(gameState) {
		var gamePromise = Game.findOne({_id: gameState.currentGameId}).exec();
		gamePromise.then(function(game) {
			res.send(getCurrentBoardAndPlayer(game, gameState));
		});		
	})
	.catch(function (err) {
		console.log("Error: " + err);
	});
});

/* Debugging Routes */
/* GET */
router.get('/', function(req, res, next) {
	res.send('Succesful GET request');
});
/* POST */
router.post('/gamestate', function(req, res, next) {
	GameState.findOne({}, function (err, gameState) {
    	if (err) return next(err);
    	res.send(gameState);
  	});
});

router.post('/allgames', function(req, res, next) {
	Game.find({}, function(err, games) {
		res.send(games);
	})
});

router.post('/clearall', function(req, res, next) {
	Game.collection.remove(function(err) {
		if (err) throw err;
		console.log("Game cleared");
	});
	GameState.collection.remove(function(err) {
		if (err) throw err;
		console.log("GameState cleared.");
	});
	res.send("Cleared.");
});

/* Helper functions */
var checkWinner = function checkWinner(board, position, playerValue) {
	var topLeftDiagonal = checkTopLeftDiagonal(board, playerValue);
	var topRightDiagonal = checkTopRightDiagonal(board, playerValue);
	var row = checkRows(board, position, playerValue);
	var column = checkColumns(board, position, playerValue);
	return topLeftDiagonal || topRightDiagonal || row || column;
}

var checkTopLeftDiagonal = function checkTopLeftDiagonal(board, playerValue) {
	if (board[0] === playerValue && 
		board[4] === playerValue &&
		board[8] === playerValue) {
		return true;
	}
	return false;
}

var checkTopRightDiagonal = function checkTopRightDiagonal(board, playerValue) {	
	if (board[2] === playerValue && 
		board[4] === playerValue &&
		board[6] === playerValue) {
		return true;
	}
	return false;
}

var checkRows = function checkRows(board, position, playerValue) {
	var rowAdjustment = determineRow(position);
	return checkRow(board, playerValue, rowAdjustment);
}

var checkRow = function checkRow(board, playerValue, rowAdjustment) {
	if (board[0 + rowAdjustment] == playerValue &&
		board[1 + rowAdjustment] == playerValue &&
		board[2 + rowAdjustment] == playerValue) {
		return true;
	}
	return false;
}

var determineRow = function determineRow(position) {
	var firstRow = new Set([0, 1, 2]);
	var secondRow = new Set([3, 4, 5]);
	var thirdRow = new Set([6, 7, 8]);
	if (firstRow.has(position)) {
		return 0;
	}
	if (secondRow.has(position)) {
		return 3;
	}
	if (thirdRow.has(position)) {
		return 6;
	}
}

var checkColumns = function checkColumns(board, position, playerValue) {
	var columnAdjustment = position % 3;
	switch(columnAdjustment) {
		case 0:
			return checkColumn(board, playerValue, columnAdjustment);
			break;
		case 1:
			return checkColumn(board, playerValue, columnAdjustment);
			break;
		case 2:
			return checkColumn(board, playerValue, columnAdjustment);
			break;
		default:
			return false;
	}
}

var checkColumn = function checkColumn(board, playerValue, columnAdjustment) {
	if (board[0 + columnAdjustment] == playerValue &&
		board[3 + columnAdjustment] == playerValue &&
		board[6 + columnAdjustment] == playerValue) {
		return true;
	}
	return false;
}

var stringifyBoard = function stringifyBoard(board) {
	var string = "```\n|---+---+---|\n";
	for (var i = 0; i < board.length; i++) {
		if (i == 0 || i == 3 || i == 6) {
			string += "|";
		}
		if (board[i] == 0) {
			string += " " + (i+1) + " |";
		}
		if (board[i] == 1) {
			string += " X |";
		}
		if (board[i] == 2) {
			string += " O |"
		}
		if ((i+1) % 3 == 0 && i < board.length) {
			string += "\n|---+---+---|\n"
		}
	}
	string += "```";
	return string;
};

var getInitialGameState = function getInitialGameState() {
	return new GameState({
				hasOngoingGame: false,
				currentPlayer: Math.floor(Math.random() * 1),
				currentGameId: "",
				positionsPlayed: 0
			});
}

var createNewGame = function createNewGame(player1, player2) {
	return new Game({
				player1: {
					name: player1,
					number: 0
				},
				player2: {
					name: player2,
					number: 1
				},
				boardArray: [0, 0, 0, 0, 0, 0, 0, 0, 0]
			});
}

var isCurrentPlayer = function isCurrentPlayer(game, currentPlayer, name) {
	return currentPlayer === getPlayerNumber(game, name);
}

var getCurrentPlayerName = function getCurrentPlayerName(game, currentPlayer) {
	var currentPlayer;
	if (game.player1.number == currentPlayer) {
		currentPlayer = game.player1.name;
	} else {
		currentPlayer = game.player2.name;
	}
	return currentPlayer;
}

var getPlayerNumber = function getPlayerNumber(game, name) {
	if (game.player1.name === name) {
		return 0;
	} else {
		return 1;
	}
}

var getVictoryString = function getVictoryString(game, currentPlayer) {
	var victoryString = "Game over! " + getCurrentPlayerName(game, currentPlayer) + " has won!";
	return victoryString;
}

var clearAll = function clearAll() {
	Game.findOneAndRemove({}, function(err) {
		if (err) throw err;
		console.log("Game cleared");
	});
	GameState.findOneAndRemove({}, function(err) {
		if (err) throw err;
		console.log("GameState cleared.");
	});
}

var getInChannelMessage = function getInChannelMessage(string) {
	var msg = {
		"response_type" : "in_channel",
		"text" : string,
		"mrkdwn" : true
	};
	return msg;
}

var getCurrentBoardAndPlayer = function getCurrentBoardAndPlayer(game, gameState) {
	return stringifyBoard(game.boardArray) + "\n" + "It is now " + getCurrentPlayerName(game, gameState.currentPlayer) + "'s turn!";
}

module.exports = router;
