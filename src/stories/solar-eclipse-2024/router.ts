import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import { Express } from "express";
import { Sequelize } from "sequelize";
import {
  getSolarEclipse2024Data,
  submitSolarEclipse2024Data,
  SolarEclipse2024Entry,
  updateSolarEclipse2024Data,
  SolarEclipse2024Update,
} from "./database";
import { initializeModels } from "./models";
import { storyRouter } from "../../story_router";

export const router = storyRouter({
  storyName: "solar-eclipse-2024",
  userExperience: true,
});

export function setup(_app: Express, db: Sequelize) {
  initializeModels(db);
}

router.put("/data", async (req, res) => {
  const data = req.body;
  const maybe = S.decodeUnknownEither(SolarEclipse2024Entry)(data);

  if (Either.isLeft(maybe)) {
    res.status(400);
    res.json({ error: "Malformed data submission" });
    return;
  }

  const response = await submitSolarEclipse2024Data(maybe.right);
  if (response === null) {
    res.status(400);
    res.json({ error: "Error creating solar eclipse 2024 entry" });
    return;
  }

  res.json({ response });
});

router.get("/data/:uuid", async (req, res) => {
  const uuid = req.params.uuid as string;
  const response = await getSolarEclipse2024Data(uuid);
  if (response === null) {
    res.status(404).json({ error: "Specified user data does not exist" });
    return;
  }
  res.json({ response });
});

router.patch("/data/:uuid", async (req, res) => {
  const uuid = req.params.uuid as string;
  const data = req.body;

  const maybe = S.decodeUnknownEither(SolarEclipse2024Update)(data);
  if (Either.isLeft(maybe)) {
    res.status(400).json({ error: "Malformed update submission" }); 
    return;
  }

  const response = await getSolarEclipse2024Data(uuid);
  if (response === null) {
    res.status(404).json({ error: "Specified user data does not exist" });
    return;
  }

  const success = await updateSolarEclipse2024Data(uuid, maybe.right);
  if (!success) {
    res.status(500).json({ error: "Error updating user data" });
    return;
  }
  res.json({ response });

});
