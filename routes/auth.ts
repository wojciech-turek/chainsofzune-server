import express from "express";
import passport from "passport";
import { Router } from "express";
import { sign } from "jsonwebtoken";
import moment from "moment";

import { asyncMiddleware } from "../middleware/asyncMiddleware";
import UserModel from "../models/userModel";
import { sendVerifyEmail } from "../services/mailer";

type TokenData = {
  token: string;
  refreshToken: string;
  email: string;
  _id: string;
  name: string;
};

interface TokensList {
  [key: string]: TokenData;
}

const tokenList: TokensList = {};
const router = Router();

router.get("/status", (req, res, next) => {
  res.status(200).json({ status: "ok" });
});

router.post(
  "/signup",
  passport.authenticate("signup", { session: false, failWithError: true }),
  async (req, res, next) => {
    res.status(200).json({ message: "signup successful" });
  }
);

router.post("/login", async (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        const error = new Error("User not found or wrong password entered");
        return next(error);
      }
      req.login(user, { session: false }, async (error) => {
        if (error) return next(error);
        const body = {
          _id: user._id,
          email: user.email,
          name: user.name,
        };

        const token = sign({ user: body }, "top_secret", {
          expiresIn: "1h",
        });
        const refreshToken = sign({ user: body }, "top_secret_refresh", {
          expiresIn: "24h",
        });

        // store tokens in cookie
        res.cookie("jwt", token);
        res.cookie("refreshJwt", refreshToken);

        // store tokens in memory
        tokenList[refreshToken] = {
          token,
          refreshToken,
          email: user.email,
          _id: user._id,
          name: user.name,
        };

        //Send back the token to the user
        return res.status(200).json({ token, refreshToken });
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

router.post(
  "verify-account",
  asyncMiddleware(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const { verifyToken } = req.body;
      const User = await UserModel.findOne({ verify_token: verifyToken });
      if (!User) {
        res.status(400).json({ message: "Incorrect verification code" });
        return;
      }
      try {
        User.verified = true;
        await User.save();
        res.status(200).json({
          message: "Your account is now verified, you can proceed to login.",
        });
      } catch (err) {
        console.log("cannot send email");
      }
    }
  )
);

router.post(
  "/send-verify-link",
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
      if (User.verified) {
        res.status(400).json({ message: "Already verified" });
        return;
      }
      if (User.verify_token_sent_at + 60 > moment().unix()) {
        res.status(400).json({
          message: "Can only request activation link every 60 seconds",
          canRequest: User.verify_token_sent_at + 60,
        });
        return;
      }
      try {
        await sendVerifyEmail(User);
        res.status(200).json({
          message:
            "An email has been sent to your mailbox, please click the link in the message to verify your account.",
        });
        User.verify_token_sent_at = moment().unix();
        User.save();
      } catch (err) {
        console.log("cannot send email");
      }
    }
  )
);

router.post("/token", (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken in tokenList) {
    const body = {
      email: tokenList[refreshToken].email,
      _id: tokenList[refreshToken]._id,
      name: tokenList[refreshToken].name,
    };
    const token = sign({ user: body }, "top_secret", { expiresIn: 300 });

    // update jwt
    res.cookie("jwt", token);
    tokenList[refreshToken].token = token;

    res.status(200).json({ token });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

router.post("/logout", (req, res) => {
  if (req.cookies) {
    const refreshToken = req.cookies["refreshJwt"];
    if (refreshToken in tokenList) delete tokenList[refreshToken];
    res.clearCookie("refreshJwt");
    res.clearCookie("jwt");
  }

  res.status(200).json({ message: "logged out" });
});

export default router;
