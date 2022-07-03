import handlebars from "handlebars";
import path from "path";
import fs from "fs";
import mg, { AuthOptions } from "nodemailer-mailgun-transport";
import nodemailer from "nodemailer";
import { IUser } from "../models/userModel";
import { projectName } from "../constants";
import Logger from "../services/logger";

const activationEmailTemplate = handlebars.compile(
  fs.readFileSync(path.resolve("./templates/verify-email.hbs"), "utf8")
);

const forgotPasswordTemplate = handlebars.compile(
  fs.readFileSync(path.resolve("./templates/forgot-password.hbs"), "utf8")
);
const resetPasswordTemplate = handlebars.compile(
  fs.readFileSync(path.resolve("./templates/reset-password.hbs"), "utf8")
);

const mailgunAuth = {
  api_key: process.env.MAILGUN_API || "",
  domain: process.env.MAILGUN_DOMAIN,
  host: "api.eu.mailgun.net",
};

const smtpTransport = nodemailer.createTransport(mg({ auth: mailgunAuth }));

const sendVerifyEmail = async (User: IUser) => {
  const htmlToSend = activationEmailTemplate({
    url: `http://localhost:${process.env.PORT || 3000}/verify-email?code=${
      User.verify_token
    }`,
    name: User.name,
  });

  const data = {
    to: User.email,
    from: process.env.EMAIL,
    subject: `Verify your account on ${projectName}`,
    html: htmlToSend,
  };
  await smtpTransport.sendMail(data);
  Logger.info(`Sent verification email to ${User.email}`);
};

const sendPasswordResetConfirmation = async (User: IUser) => {
  const htmlToSend = resetPasswordTemplate({
    name: User.name,
  });

  const data = {
    to: User.email,
    from: process.env.EMAIL,
    html: htmlToSend,
    subject: "Password successfully reset!",
  };
  await smtpTransport.sendMail(data);
};

const sendForgotPassword = async (User: IUser, token: string) => {
  const htmlToSend = forgotPasswordTemplate({
    url: `http://localhost:${
      process.env.PORT || 3000
    }/reset-password?token=${token}`,
    name: User.name,
  });
  const data = {
    to: User.email,
    from: process.env.EMAIL,
    subject: `${projectName} Password Reset`,
    html: htmlToSend,
  };
  await smtpTransport.sendMail(data);
  Logger.info(`Sent reset password email to ${User.email}`);
};

export { sendVerifyEmail, sendPasswordResetConfirmation, sendForgotPassword };
