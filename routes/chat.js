const express = require("express");
const passport = require("passport");
const ChatModel = require("../models/chatModel");
const asyncMiddleware = require("../middleware/asyncMiddleware");

const router = express.Router();

router.post(
  "/submit-chatline",
  passport.authenticate("jwt", { session: false }),
  asyncMiddleware(async (req, res, next) => {
    const { message } = req.body;
    const { email, name } = req.user;
    await ChatModel.create({ email, message });
    io.emit("new message", {
      username: name,
      message,
    });
    res.status(200).json({ status: "ok" });
  })
);

module.exports = router;
