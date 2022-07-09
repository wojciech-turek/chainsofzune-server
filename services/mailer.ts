import handlebars from "handlebars";
import path from "path";
import fs from "fs";
import mg from "nodemailer-mailgun-transport";
import nodemailer from "nodemailer";
import { IUser } from "../models/userModel";
import { devURL, prodURL, projectName } from "../constants";
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
  auth: {
    api_key: process.env.MAILGUN_API || "",
    domain: process.env.MAILGUN_DOMAIN,
  },
  host: "api.eu.mailgun.net",
};

const smtpTransport = nodemailer.createTransport(mg(mailgunAuth));

const sendVerifyEmail = async (User: IUser) => {
  const htmlToSend = activationEmailTemplate({
    url: `${
      process.env.NODE_ENV === "production"
        ? `${prodURL}/activate/${User.verify_token}`
        : `${devURL}/activate/${User.verify_token}`
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
    url: `${
      process.env.NODE_ENV === "production"
        ? `${prodURL}/set-password?token=${token}`
        : `${devURL}/set-password?token=${token}`
    }`,
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
