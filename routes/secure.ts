import express from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import UserModel from "../models/userModel";

const router = express.Router();

router.post(
  "/submit-score",
  asyncMiddleware(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const { email, score } = req.body;
      await UserModel.updateOne({ email }, { highScore: score });
      res.status(200).json({ status: "ok" });
    }
  )
);

router.get(
  "/scores",
  asyncMiddleware(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const users = await UserModel.find({}, "name highScore -_id")
        .sort({ highScore: -1 })
        .limit(10);
      res.status(200).json(users);
    }
  )
);

export default router;
