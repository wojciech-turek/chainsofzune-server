import { Schema as _Schema, model } from "mongoose";
const Schema = _Schema;
const ChatSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});
const ChatModel = model("chat", ChatSchema);
export default ChatModel;
