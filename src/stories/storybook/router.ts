import { Router } from "express";
import { StorySetupParams } from "../../types";

export const router = Router();

export function setup(_params: StorySetupParams) {}

export function createEndpoints(router: Router) {
  router.put("/user-experience", async (_req, res) => {
    res.status(200).json({ success: true });
  });
}
