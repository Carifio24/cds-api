import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import { Express } from "express";
import { Sequelize } from "sequelize";

import { initializeModels } from "./models";
import { addVisitForStory } from "../../database";
import { TempoLiteEntry, TempoLiteUpdate, getTempoLiteData, submitTempoLiteData, updateTempoLiteData } from "./database";
import { storyRouter } from "../../story_router";

export const router = storyRouter({
  storyName: "tempo-lite",
  userExperience: true,
});

export function setup(_app: Express, db: Sequelize) {
  initializeModels(db);
}

router.put("/data", async (req, res) => {
  const data = req.body;
  const maybe = S.decodeUnknownEither(TempoLiteEntry)(data);

  if (Either.isLeft(maybe)) {
    res.status(400);
    res.json({ error: "Malformed data submission" });
    return;
  }
  
  const response = await submitTempoLiteData(maybe.right);
  if (response === null) {
    res.status(400);
    res.json({ error: "Error creating TEMPO Lite entry" });
    return;
  }

  res.json({ response });
});

router.get("/data/:uuid", async (req, res) => {
  const uuid = req.params.uuid as string;
  const response = await getTempoLiteData(uuid);
  if (response === null) {
    res.status(404).json({ error: "Specified user data does not exist" });
    return;
  }

  res.json({ response });
});

router.patch("/data/:uuid", async (req, res) => {
  const data = req.body;

  const maybe = S.decodeUnknownEither(TempoLiteUpdate)(data);
  if (Either.isLeft(maybe)) {
    res.status(400).json({ error: "Malformed update submission" });
    return;
  }

  const uuid = req.params.uuid as string;
  const current = await getTempoLiteData(uuid);
  if (current === null) {
    res.status(404).json({ error: "Specified user data does not exist" });
    return;
  }

  const response = await updateTempoLiteData(uuid, maybe.right);
  if (response === null) {
    res.status(500).json({ error: "Error updating user data" });
    return;
  }
  res.json({ response });

});

router.post("/visit", async (req, res) => {
  const schema = S.struct({
    info: S.struct({
      venue: S.string,
    }),
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
  const storyVisitInfo = await addVisitForStory("tempo_lite", data.info);
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
