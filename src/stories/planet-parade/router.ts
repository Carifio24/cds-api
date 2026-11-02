import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import { Router } from "express";

import {
  PlanetParadeEntry,
  PlanetParadeUpdate,
  getPlanetParadeData,
  submitPlanetParadeData,
  updatePlanetParadeData
} from "./database";
import { initializeModels } from "./models";
import { storyRouter } from "../../story_router";
import { StorySetupParams } from "../../types";

export const router = storyRouter({
  storyName: "planet-parade",
  userExperience: true,
});

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function createEndpoints(router: Router) {
  router.put("/data", async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(PlanetParadeEntry)(data);
  
    if (Either.isLeft(maybe)) {
      res.status(400);
      res.json({ error: "Malformed data submission" });
      return;
    }
    
    const response = await submitPlanetParadeData(maybe.right);
    if (response === null) {
      res.status(400);
      res.json({ error: "Error creating planet parade entry" });
      return;
    }
  
    res.json({ response });
    
  });
  
  router.get("/data/:uuid", async (req, res) => {
    const uuid = req.params.uuid as string;
    const response = await getPlanetParadeData(uuid);
    if (response === null) {
      res.status(404).json({ error: "Specified user data does not exist" });
      return;
    }
  
    res.json({ response });
  });
  
  router.patch("/data/:uuid", async (req, res) => {
    const data = req.body;
  
    const maybe = S.decodeUnknownEither(PlanetParadeUpdate)(data);
    if (Either.isLeft(maybe)) {
      res.status(400).json({ error: "Malformed update submission" });
      return;
    }
  
    const uuid = req.params.uuid as string;
    const current = await getPlanetParadeData(uuid);
    if (current === null) {
      res.status(404).json({ error: "Specified user data does not exist" });
      return;
    }
  
    const response = await updatePlanetParadeData(uuid, maybe.right);
    if (response === null) {
      res.status(500).json({ error: "Error updating user data" });
      return;
    }
    res.json({ response });
  
  });
}
