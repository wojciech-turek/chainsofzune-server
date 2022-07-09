import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser {
  email: string;
  password: string;
  walletAddress: string;
  nonce: number;
  name: string;
  resetToken: string | undefined;
  resetTokenExp: Date | undefined;
  verified: boolean;
  verify_token: string;
  verify_token_sent_at: number;
}

interface IUserDocument extends IUser, Document {
  isValidPassword: (password: string) => Promise<boolean>;
}

interface IUserModel extends Model<IUserDocument> {
  findByUsernameEmailOrWallet: (
    username: string,
    email: string,
    wallet: string
  ) => Promise<IUserDocument>;
}

const UserSchema: Schema<IUserDocument> = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  nonce: {
    type: Number,
    required: true,
    default: 0,
  },
  name: {
    type: String,
    required: true,
  },
  resetToken: {
    type: String,
  },
  resetTokenExp: {
    type: Date,
  },
  verified: {
    type: Boolean,
    required: true,
  },
  verify_token: {
    type: String,
    required: true,
  },
  verify_token_sent_at: {
    type: Number,
  },
});

UserSchema.methods.isValidPassword = async function (password: string) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);
  return compare;
};

UserSchema.statics.findByUsernameEmailOrWallet = function (
  username: string,
  email: string,
  wallet: string
) {
  return this.findOne({
    $or: [{ name: username }, { email: email }, { walletAddress: wallet }],
  });
};

const UserModel = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);

export default UserModel;
