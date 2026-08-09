import { Router } from "express";
import {
  getEclipseMiniResponse,
  getAllEclipseMiniResponses,
  isValidEclipseMiniData,
  submitEclipseMiniResponse
} from "./database";
import { initializeModels } from "./models";
import { StorySetupParams } from "../../types";

export const router = Router();

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function createEndpoints(router: Router) {
  router.put("/annular-eclipse-2023/response", async (req, res) => {
    const data = req.body; 
    const valid = isValidEclipseMiniData(data);
  
    if (!valid) {
      res.status(400);
      res.json({ error: "Malformed response submission" });
      return;
    }
  
    const response = await submitEclipseMiniResponse(data);
    if (!response) {
      res.status(400);
      res.json({ error: "Error creating annular eclipse 2023 mini response" });
      return;
    }
  
    res.json({ response });
  
  });
  
  router.get("/annular-eclipse-2023/responses", async (_req, res) => {
    const responses = await getAllEclipseMiniResponses();
    res.json({ responses });
  });
  
  router.get("/annular-eclipse-2023/response/:userUUID", async (req, res) => {
    const uuid = req.params.userUUID as string;
    const response = await getEclipseMiniResponse(uuid);
    res.json({ response });
  });
}
