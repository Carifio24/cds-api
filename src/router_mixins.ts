import { Router } from "express";
import { Model } from "sequelize";
import { ExperienceRating } from "./models/user_experience";
import { getUserExperienceForStory, setExperienceInfoForStory } from "./database";
import { logger } from "./logger";
import { Constructor } from "./utils";

import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";

export interface TrackingDataOptions<A,I, M extends Model> {
  updateType: S.Schema<A,I>;
  modelType: Constructor<M>;
}

function createEntryType<A,I>(updateType: S.Schema<A,I>) {
  return S.extend(updateType, S.struct({ user_uuid: S.string }));
}

export function addTrackingData<A,I,M extends Model>(
  router: Router,
  storyName: string,
  options: TrackingDataOptions<A,I,M>,
) {

  const entryType = createEntryType(options.updateType);

  router.put("/data", async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(entryType)(data);

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

  router.patch("/data/:uuid", async (req, res) => {
    const data = req.body;
  
    const maybe = S.decodeUnknownEither(options.updateType)(data);
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
  }
}

export function addUserExperience(router: Router, storyName: string) {

  router.put("/user-experience", async (req, res) => {
    const schema = S.struct({
      story_name: S.string,
      comments: S.optional(S.string),
      uuid: S.string,
      question: S.string,
      rating: S.optional(S.enums(ExperienceRating)),
    });
    const content = {
      ...req.body,
      story_name: storyName,
    };
    const maybe = S.decodeUnknownEither(schema)(content);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        success: false,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error The generated schema has a properties field
        error: `Invalid request body; should have the following schema: ${JSON.stringify(JSONSchema.make(schema).properties)}`,
      });
      return;
    }

    const data = maybe.right;
    const experienceInfo = await setExperienceInfoForStory(data);
    if (experienceInfo !== null) {
      res.json({
        success: true,
        rating: experienceInfo.toJSON(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error creating user experience info",
      });
    }
  }); 

  router.get("/user-experience/:uuid", async (req, res) => {
    const uuid = req.params.uuid as string;
    const ratings = await getUserExperienceForStory(uuid, storyName)
      .catch(error => {
        logger.error(error);
        return null;
      });

    if (ratings === null) {
      res.status(500).json({
        error: `There was an error creating a user experience rating for used ${uuid}, story ${storyName}`,
      });
      return;
    }

    if (ratings.length === 0) {
      res.status(404).json({
        error: `User ${uuid} does not have any user experience ratings for story ${storyName}`,
      });
      return;
    }

    res.json({ ratings });
  });

}
