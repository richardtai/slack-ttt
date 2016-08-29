# slack-ttt

```slack-ttt``` is an API using the ```MEAN``` stack that allows users to play tic-tac-toe in Slack.

## Installation

#### Install dependencies
``` npm install ```

#### Start mongodb
``` mongod ```

#### Start server
``` nodemon ```

## General

Users can challenge another player within the channel to a game of tic-tac-toe by typing the slash command ```/ttt [enter username]```.

The board can be seen by any player that types the slash command ```/currentboard```.

For those playing, a player can choose a spot on the tic-tac-toe board by typing the slash command ```/choose [1-9]``` where
the number input corresponds to a position on the board, as follows: 

```
|---+---+---|
| 1 | 2 | 3 |
|---+---+---|
| 4 | 5 | 6 |
|---+---+---|
| 7 | 8 | 9 |
|---+---+---|
```

For more help, users can enter the slash command ```/usage```.

## Requirements

- [x] Users can create a new game in any Slack channel by challenging another user (using their username).
- [x] A channel can have at most one game being played at a time.
- [x] Anyone in the channel can run a command to display the current board and list whose turn it is.
- [x] Users can specify their next move, which also publicly displays the board in the channel after the move with a reminder of whose turn it is.
- [x] Only the user whose turn it is can make the next move.
- [x] When a turn is taken that ends the game, the response indicates this along with who won.

## To Do
- [ ] Unit tests using ```mocha``` and ```chai```.


