import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import type { Router } from "express";
import {
  getSolarEclipse2026Data,
  submitSolarEclipse2026Data,
  SolarEclipse2026Entry,
  updateSolarEclipse2026Data,
  SolarEclipse2026Update,
} from "./database";
import { initializeModels } from "./models";
import { storyRouter } from "../../story_router";
import type { StorySetupParams } from "../../types";

export const router = storyRouter({
  storyName: "solar-eclipse-2026",
  userExperience: true,
});

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function createEndpoints(router: Router) {
  router.put("/data", async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(SolarEclipse2026Entry)(data);
  
    if (Either.isLeft(maybe)) {
      res.status(400);
      res.json({ error: "Malformed data submission" });
      return;
    }
  
    const response = await submitSolarEclipse2026Data(maybe.right);
    if (response === null) {
      res.status(400);
      res.json({ error: "Error creating solar eclipse 2026 entry" });
      return;
    }
  
    res.json({ response });
  });
  
  router.get("/data/:uuid", async (req, res) => {
    const uuid = req.params.uuid as string;
    const response = await getSolarEclipse2026Data(uuid);
    if (response === null) {
      res.status(404).json({ error: "Specified user data does not exist" });
      return;
    }
    res.json({ response });
  });
  
  router.patch("/data/:uuid", async (req, res) => {
    const uuid = req.params.uuid as string;
    const data = req.body;
  
    const maybe = S.decodeUnknownEither(SolarEclipse2026Update)(data);
    if (Either.isLeft(maybe)) {
      res.status(400).json({ error: "Malformed update submission" }); 
      return;
    }
  
    const response = await getSolarEclipse2026Data(uuid);
    if (response === null) {
      res.status(404).json({ error: "Specified user data does not exist" });
      return;
    }
  
    const success = await updateSolarEclipse2026Data(uuid, maybe.right);
    if (!success) {
      res.status(500).json({ error: "Error updating user data" });
      return;
    }
    res.json({ response });
  
  });
}
