import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import { Router } from "express";

import { initializeModels } from "./models";
import { addVisitForStory } from "../../database";
import { SeasonsEntry, SeasonsUpdate, getSeasonsData, submitSeasonsData, updateSeasonsData } from "./database";
import { StorySetupParams } from "../../types";

export const router = Router();

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function createEndpoints(router: Router) {
  router.put("/data", async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(SeasonsEntry)(data);
  
    if (Either.isLeft(maybe)) {
      res.status(400);
      res.json({ error: "Malformed data submission" });
      return;
    }
    
    const response = await submitSeasonsData(maybe.right);
    if (response === null) {
      res.status(400);
      res.json({ error: "Error creating Seasons entry" });
      return;
    }
  
    res.json({ response });
  });
  
  router.get("/data/:uuid", async (req, res) => {
    const uuid = req.params.uuid as string;
    const response = await getSeasonsData(uuid);
    if (response === null) {
      res.status(404).json({ error: "Specified user data does not exist" });
      return;
    }
  
    res.json({ response });
  });
  
  router.patch("/data/:uuid", async (req, res) => {
    const data = req.body;
  
    const maybe = S.decodeUnknownEither(SeasonsUpdate)(data);
    if (Either.isLeft(maybe)) {
      console.log(maybe.left.error);
      res.status(400).json({ error: "Malformed update submission" });
      return;
    }
  
    const uuid = req.params.uuid as string;
    const current = await getSeasonsData(uuid);
    if (current === null) {
      res.status(404).json({ error: "Specified user data does not exist" });
      return;
    }
  
    const response = await updateSeasonsData(uuid, maybe.right);
    if (response === null) {
      res.status(500).json({ error: "Error updating user data" });
      return;
    }
    res.json({ response });
  });
  
  router.post("/visit", async (req, res) => {
    const schema = S.struct({
      info: S.object,
    });
    const body = req.body;
    const maybe = S.decodeUnknownEither(schema)(body);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        success: false,
        error: "Invalid request body; should have form { info: { venue: <string> } }",
      });
      return;
    }
  
    const data = maybe.right;
    const storyVisitInfo = await addVisitForStory("seasons", data.info);
    if (storyVisitInfo !== null) {
      res.json({
        success: true,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error creating story visit info entry",
      });
    }
  });
}
