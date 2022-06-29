import passport from "passport";
import { Router } from "express";
import { sign } from "jsonwebtoken";
import Logger from "../services/logger";

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
  passport.authenticate("signup", { session: false }),
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
          expiresIn: 300,
        });
        const refreshToken = sign({ user: body }, "top_secret_refresh", {
          expiresIn: 86400,
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
