var mongoose = require('mongoose');

var GameSchema = new mongoose.Schema({
	player1: {
		name: String,
		number: Number
	},
	player2: {
		name: String,
		number: Number
	},
	boardArray: [Number]
});

var Game = mongoose.model('Game', GameSchema);
module.exports = Game;