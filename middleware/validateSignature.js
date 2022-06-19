import UserModel from "../models/userModel";
import toLowerCase from "../utils/utils";
import sigUtil from "eth-sig-util";
import ethUtil from "ethereumjs-util";

const validateSignature = async (publicKey, signature, retrievedAddr) => {
  try {
    publicKey = toLowerCase(publicKey);
    retrievedAddr = toLowerCase(retrievedAddr);
    let account = await UserModel.findOne({ walletAddress: publicKey });
    let nonce = account.nonce;
    let msg = `Approve signature with nonce ${nonce}`;
    let msgBufferHex = ethUtil.bufferToHex(Buffer.from(msg, "utf8"));
    let address = sigUtil.recoverPersonalSignature({
      data: msgBufferHex,
      sig: signature,
    });
    if (toLowerCase(address) == publicKey) {
      account.nonce = Math.floor(Math.random() * 9999999);
      await account.save();
      return true;
    } else if (toLowerCase(address) == retrievedAddr) {
      account.nonce = Math.floor(Math.random() * 9999999);
      await account.save();
      return true;
    } else return false;
  } catch (error) {
    return false;
  }
};

export default validateSignature;
