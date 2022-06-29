import express from "express";
import handlebars from "handlebars";
import fs from "fs";
import mg, { AuthOptions } from "nodemailer-mailgun-transport";
import nodemailer from "nodemailer";
import path from "path";
import crypto from "crypto";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import UserModel from "../models/userModel";

const mailgunAuth: AuthOptions = {
  api_key: process.env.MAILGUN_API || "",
  domain: process.env.MAILGUN_DOMAIN,
};

const smtpTransport = nodemailer.createTransport(mg({ auth: mailgunAuth }));

const forgotPasswordTemplate = handlebars.compile(
  fs.readFileSync(path.resolve("./templates/forgot-password.hbs"), "utf8")
);
const resetPasswordTemplate = handlebars.compile(
  fs.readFileSync(path.resolve("./templates/reset-password.hbs"), "utf8")
);

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
      // send user password reset email
      const htmlToSend = forgotPasswordTemplate({
        url: `http://localhost:${
          process.env.PORT || 3000
        }/reset-password.html?token=${token}`,
        name: User.name,
      });
      const data = {
        to: User.email,
        from: process.env.EMAIL,
        subject: "Phaser Leaderboard Password Reset",
        html: htmlToSend,
      };
      try {
        await smtpTransport.sendMail(data);
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
      const htmlToSend = resetPasswordTemplate({
        name: User.name,
      });
      // send User password update email
      const data = {
        to: User.email,
        from: process.env.EMAIL,
        html: htmlToSend,
        subject: "Phaser Leaderboard Password Reset Confirmation",
      };
      await smtpTransport.sendMail(data);
      res.status(200).json({ message: "password updated" });
    }
  )
);
export default router;
