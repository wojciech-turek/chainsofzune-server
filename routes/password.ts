import express from "express";
import crypto from "crypto";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import UserModel from "../models/userModel";
import {
  sendForgotPassword,
  sendPasswordResetConfirmation,
} from "../services/mailer";

const router = express.Router();

router.post(
  "/forgot-password",
  asyncMiddleware(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const { email } = req.body;
      const User = await UserModel.findOne({ email });
      if (!User) {
        res.status(400).json({ message: "invalid email" });
        return;
      }

      // create user token
      const buffer = crypto.randomBytes(20);
      const token = buffer.toString("hex");
      // update user reset password token and exp
      await UserModel.findByIdAndUpdate(
        { _id: User._id },
        { resetToken: token, resetTokenExp: Date.now() + 600000 }
      );
      try {
        // send user password reset email
        await sendForgotPassword(User, token);
        res.status(200).json({
          message:
            "An email has been sent to your email. Password reset link is only valid for 10 minutes.",
        });
      } catch (err) {
        console.log("cannot send email");
      }
    }
  )
);

router.post(
  "/reset-password",
  asyncMiddleware(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const User = await UserModel.findOne({
        resetToken: req.body.token,
        resetTokenExp: { $gt: Date.now() },
      });
      if (!User) {
        res.status(400).json({ message: "invalid token" });
        return;
      }
      // ensure provided password matches verified password
      if (req.body.password !== req.body.verifiedPassword) {
        res.status(400).json({ message: "passwords do not match" });
        return;
      }
      // update user model
      User.password = req.body.password;
      User.resetToken = undefined;
      User.resetTokenExp = undefined;
      await User.save();
      await sendPasswordResetConfirmation(User);
      res.status(200).json({ message: "password updated" });
    }
  )
);
export default router;
