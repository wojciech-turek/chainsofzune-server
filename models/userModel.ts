import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcrypt";

interface IUser {
  email: string;
  password: string;
  walletAddress: string;
  nonce: number;
  name: string;
  name_lowercase: string;
  resetToken: string | undefined;
  resetTokenExp: Date | undefined;
  verified: boolean;
  verify_token: string;
}

interface IUserDocument extends IUser, Document {
  isValidPassword: (password: string) => Promise<boolean>;
}

interface IUserModel extends Model<IUserDocument> {
  findByUsernameOrEmail: (
    username: string,
    email: string
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
  name_lowercase: {
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
});

UserSchema.pre("save", async function (next: any) {
  // const user = this;
  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;
  next();
});

UserSchema.methods.isValidPassword = async function (password: string) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);
  return compare;
};

UserSchema.statics.findByUsernameOrEmail = function (
  username: string,
  email: string
) {
  return this.findOne({
    $or: [{ name_lowercase: username }, { email: email }],
  });
};

const UserModel = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);

export default UserModel;
