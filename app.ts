// reads in our .env file and makes those values available as environment variables
require("dotenv").config({ path: __dirname + "/.env" });

import express from "express";
import bodyParser from "body-parser";
import { createServer } from "http";
import mongoose from "mongoose";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./auth/auth";
import authRoutes from "./routes/auth";
import passwordRoutes from "./routes/password";
import chatRoutes from "./routes/chat";
import secureRoutes from "./routes/secure";
import { Server, Socket } from "socket.io";
import Logger from "./services/logger";
// import session from "express-session";

interface Error {
  status?: number;
  message?: string;
}

type Player = {
  flipX: boolean;
  x: number;
  y: number;
  playerId: string;
};

// setup mongo connection
const uri = process.env.DB_URL!;
mongoose.connect(uri);
mongoose.connection.on("error", (error) => {
  Logger.error(error);
  process.exit(1);
});
mongoose.connection.on("connected", function () {
  Logger.info("Server has been connected to the db");
});
// create an instance of an express app
const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  // ...
});

// app.use(
//   session({
//     secret: "keyboard cat",
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// app.use(passport.initialize());
// app.use(passport.session());

// update express settings
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());

app.use(cors({ origin: true }));

const players: { [key: string]: Player } = {};
io.on("connection", function (socket: Socket) {
  console.log("a user connected: ", socket.id);
  // create a new player and add it to our players object
  players[socket.id] = {
    flipX: false,
    x: Math.floor(Math.random() * 400) + 60,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
  };
  // send the players object to the new player
  socket.emit("currentPlayers", players);
  // update all other players of the new player
  socket.broadcast.emit("newPlayer", players[socket.id]);
  // when a player disconnects, remove them from our players object
  socket.on("disconnect", function () {
    console.log("user disconnected: ", socket.id);
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit("disconnected", socket.id);
  });
  // when a plaayer moves, update the player data
  socket.on("playerMovement", function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].flipX = movementData.flipX;
    // emit a message to all players about the player that moved
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });
});

// main routes
app.use("/", authRoutes);
app.use("/", passwordRoutes);
app.use("/", chatRoutes);
app.use("/", passport.authenticate("jwt", { session: false }), secureRoutes);

// catch all other routes
app.use((req, res, next) => {
  res.status(404).json({ message: "404 - Not Found" });
});
// handle errors
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    Logger.error(err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
);
httpServer.listen(process.env.PORT || 3000, () => {
  Logger.info(`Server started on port ${process.env.PORT || 3000}`);
});
