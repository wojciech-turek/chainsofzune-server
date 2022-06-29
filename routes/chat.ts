import { io } from "./../app";
import express from "express";
import passport from "passport";
import ChatModel from "../models/chatModel";
import { asyncMiddleware } from "../middleware/asyncMiddleware";

const router = express.Router();

router.post(
  "/submit-chatline",
  passport.authenticate("jwt", { session: false }),
  asyncMiddleware(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const { message } = req.body;
      const { email, name }: any = req.user;
      await ChatModel.create({ email, message });
      io.emit("new message", {
        username: name,
        message,
      });
      res.status(200).json({ status: "ok" });
    }
  )
);

export default router;
