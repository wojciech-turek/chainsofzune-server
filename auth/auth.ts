import bcrypt from "bcrypt";
import { toLowerCase } from "./../utils/utils";
import express from "express";
import isEmail from "validator/lib/isEmail";

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JWTstrategy } from "passport-jwt";
import { recoverPersonalSignature } from "eth-sig-util";
import { bufferToHex } from "ethereumjs-util";
import randomstring from "randomstring";

import UserModel from "../models/userModel";
import Logger from "../services/logger";
import { sendVerifyEmail } from "../services/mailer";

// handle user registration
passport.use(
  "signup",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (
      req: express.Request,
      email: string,
      password: string,
      done: any
    ) => {
      if (!isEmail(email)) {
        return done({ message: "Email incorrect" });
      }
      const { name, walletAddress, signature, confirmPassword } = req.body;
      const User = await UserModel.findByUsernameEmailOrWallet(
        toLowerCase(name),
        email,
        walletAddress
      );
      if (User && User.email === email) {
        return done({ message: "Email already exists" });
      }

      if (User && User.name.toLowerCase() === toLowerCase(name)) {
        return done({ message: "Name already exists" });
      }

      if (password !== confirmPassword) {
        return done({ message: "Your passwords do not match" });
      }

      if (typeof password !== "string" || password.length < 8) {
        return done({ message: "Password must be at least 8 characters" });
      }

      if (User && User.walletAddress === walletAddress) {
        return done({ message: "Wallet address already used" });
      }

      const msg = `Creating new account account! Request: ${0}`;
      const msgBufferHex = bufferToHex(Buffer.from(msg, "utf8"));
      const address = recoverPersonalSignature({
        data: msgBufferHex,
        sig: signature,
      });

      if (toLowerCase(walletAddress) !== toLowerCase(address)) {
        return done({ message: "Signature is incorrect" });
      }

      const nonce = Math.floor(Math.random() * 9999999);

      var verificationToken = randomstring.generate({
        length: 64,
      });

      const hash = await bcrypt.hash(password, 10);
      password = hash;

      try {
        const user = await UserModel.create({
          email,
          verified: false,
          verify_token: verificationToken,
          password,
          name,
          walletAddress: toLowerCase(walletAddress),
          nonce,
        });
        Logger.info("New user created");
        await sendVerifyEmail(user);
        return done(null, user);
      } catch (error) {
        console.log(error);
        done(error);
      }
    }
  )
);

passport.use(
  "login",
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (email: string, password: string, done: any) => {
      try {
        const user = await UserModel.findOne({ email });
        if (!user) {
          return done({ message: "User not found" });
        }
        if (user.verified === false) {
          return done({
            message: "Please verify your account first",
          });
        }
        const validate = await user.isValidPassword(password);
        if (!validate) {
          return done({ message: "Wrong username or password" });
        }
        Logger.info(`User ${email} logged in.`);
        return done(null, user, { message: "Logged in Successfully" });
      } catch (error) {
        return done(error);
      }
    }
  )
);

// verify token is valid
passport.use(
  new JWTstrategy(
    {
      secretOrKey: "top_secret",
      jwtFromRequest: function (req: any) {
        let token = null;
        if (req && req.cookies) token = req.cookies["jwt"];
        return token;
      },
    },
    async (token: any, done: any) => {
      try {
        return done(null, token.user);
      } catch (error) {
        done(error);
      }
    }
  )
);
