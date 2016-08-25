var mongoose = require('mongoose');

var GameStateSchema = new mongoose.Schema({
	hasOngoingGame: Boolean,
	currentPlayer: Number,
	currentGameId: String,
	positionsPlayed: Number
});

var GameState = mongoose.model('GameState', GameStateSchema);
module.exports = GameState;